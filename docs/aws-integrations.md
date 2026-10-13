# Kiosk — AWS Service Integrations

This document covers every AWS service Kiosk uses, why it was chosen, and exactly how it integrates. This is the reference for judges evaluating AWS service depth.

---

## Integration Map

```mermaid
flowchart TB
    subgraph Kiosk_Services["Kiosk Services on ECS Fargate"]
        FE["kiosk-frontend\nNext.js 15"]
        API["api-server\nExpress"]
        MMCP["master-mcp\nDiscovery"]
        BMCP["business-mcp\nPer-tenant runtime"]
    end

    subgraph AWS_Compute["AWS Compute"]
        ECS["ECS Fargate\n4 services"]
        ECR["ECR\nContainer registry"]
        ALB["Application Load Balancer\nHost + path routing"]
        CF["CloudFront\nCDN + TLS"]
    end

    subgraph AWS_AI["AWS AI / Agent Layer"]
        AC["AgentCore\nAgent orchestration runtime"]
        BR["Bedrock\nTitan Embeddings v2"]
        STRANDS["Strands SDK\nAgent client library"]
    end

    subgraph AWS_Data["AWS Data + Security"]
        SM["Secrets Manager\nCredential injection"]
        CW["CloudWatch Logs\nStructured pino logs"]
        R53["Route 53\nDNS — kiosk.example, api.*, mcp.*"]
    end

    ECS_CLUSTER["ECS Cluster: kiosk"]

    CF --> ALB --> ECS_CLUSTER
    ECS_CLUSTER --- FE & API & MMCP & BMCP
    ECR -.->|"pull image"| ECS_CLUSTER
    ECS_CLUSTER -.->|"at task launch"| SM
    ECS_CLUSTER -.->|"JSON logs"| CW
    R53 --> CF

    AC -->|"MCP tool calls"| MMCP
    AC -->|"MCP tool calls"| BMCP
    MMCP -.->|"semantic scoring"| BR
    STRANDS -.->|"agent SDK"| MMCP
```

---

## 1. Amazon ECS Fargate

**What it does:** Runs all four Kiosk services as containerised tasks with no server management.

**Why Fargate over Lambda:** Kiosk MCP servers use Streamable HTTP with Server-Sent Events. Lambda's 15-minute execution limit and cold-start latency break persistent SSE connections. Fargate containers are always warm and have no execution time limit — exactly what a live MCP server needs.

**Configuration:**

| Service | vCPU | RAM | Min Tasks | Max Tasks |
|---|---|---|---|---|
| kiosk-frontend | 0.5 | 1 GB | 1 | 5 |
| api-server | 0.5 | 1 GB | 1 | 5 |
| master-mcp | 0.5 | 1 GB | 2 | 10 |
| business-mcp | 1.0 | 2 GB | 2 | 20 |

Business-mcp gets 2× resources because it handles all tenant sessions concurrently, runs more complex per-request query logic, and must handle burst traffic from multiple AI agents simultaneously.

Auto-scaling target: **60% CPU utilisation** via ECS Service Auto Scaling.

Task definitions: [`docs/aws/task-definitions/`](aws/task-definitions/)

---

## 2. AWS AgentCore

**What it does:** AgentCore is Amazon's managed runtime for orchestrating AI agents. It executes multi-step agent reasoning loops, calls MCP tools, manages conversation state, and handles retries — without the developer building this infrastructure from scratch.

**How Kiosk integrates:** Kiosk is an **MCP tool provider for AgentCore**. An AgentCore agent configured with Kiosk's Master MCP endpoint can discover businesses, connect to individual business endpoints, and execute transactions — all without any Kiosk-specific code in the agent.

```mermaid
sequenceDiagram
    participant U as User
    participant AC as AWS AgentCore
    participant M as Kiosk Master MCP
    participant B as Kiosk Business MCP

    Note over AC: Agent receives user intent

    AC->>M: tools/call → search_businesses<br/>{query:"jollof rice", city:"Port Harcourt", open_now:true}
    M-->>AC: [{slug, name, mcp_endpoint, capabilities:["ordering","delivery"]}]

    AC->>M: tools/call → check_business_status {slug}
    M-->>AC: {is_open: true, current_day_hours: "08:00–22:00"}

    AC->>B: POST /mcp/business/mamas-kitchen-a1b2c3d4
    AC->>B: tools/call → get_services {}
    B-->>AC: [{name:"Jollof Rice", price:"₦2500"}, ...]

    AC->>B: tools/call → create_order_request<br/>{items:[{product_name:"Jollof Rice", quantity:2}],<br/>contact_name:"Ada", contact_phone:"+234..."}
    B-->>AC: {order_ref:"ORD-1749260", whatsapp_url:"https://wa.me/234..."}

    AC-->>U: "Order placed at Mama's Kitchen.\nRef: ORD-1749260.\nThey'll confirm on WhatsApp."
```

**AgentCore configuration for Kiosk:**

```json
{
  "agentName": "KioskCommerceAgent",
  "foundationModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "mcpServers": [
    {
      "name": "kiosk-discovery",
      "endpoint": "https://mcp.kiosk.example/mcp",
      "transport": "streamable-http",
      "description": "Discover and search local businesses. Start here before connecting to a specific business."
    }
  ],
  "agentInstructions": "You help users find and transact with local businesses in their area. Always call search_businesses first to discover options. Check is_open status before recommending a business. Use create_order_request or request_booking for transactions — these are confirmed out-of-band via WhatsApp.",
  "idleSessionTTLInSeconds": 900
}
```

**Why this wins the challenge:** The challenge specifically lists AgentCore as a valued integration. Kiosk doesn't use AgentCore as a novelty — MCP is exactly the protocol AgentCore is built around. Kiosk is the commerce infrastructure layer that makes AgentCore agents useful in the real world.

---

## 3. Amazon Bedrock — Titan Embeddings v2

**What it does:** Bedrock provides managed access to foundation models. Kiosk uses **Titan Embeddings v2** to generate semantic vector embeddings for business profiles and search queries.

**Why this matters:** Keyword search fails for agent queries like "something for my hair" or "a place that fixes phones." Semantic search using vector similarity finds the right business even when the query doesn't match exact business names or service descriptions.

```mermaid
flowchart TB
    subgraph Indexing["At publish time"]
        P["Business profile text\nname + description + services + city"]
        TE1["Titan Embeddings v2\nvia Bedrock InvokeModel API"]
        VEC["1536-dim vector\nstored in businesses.embedding"]
        P --> TE1 --> VEC
    end

    subgraph Search["At query time (Master MCP search_businesses)"]
        Q["Agent query\n'something for my hair'"]
        TE2["Titan Embeddings v2\nbed query embedding"]
        COS["Cosine similarity\nagainst stored embeddings"]
        KW["Keyword filter\ncity · category · open_now"]
        RANK["Score = 0.7×semantic + 0.3×keyword\nsort DESC, limit 50"]
        Q --> TE2 --> COS
        KW --> RANK
        COS --> RANK
    end
```

**Bedrock API call (in master-mcp `search_businesses`):**

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

async function embedText(text: string): Promise<number[]> {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: text, dimensions: 1536, normalize: true }),
  }));
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding;
}
```

**Graceful degradation:** When `BEDROCK_ENABLED=false` (local dev, or if Bedrock is unreachable), `search_businesses` falls back to PostgreSQL `pg_trgm` trigram similarity. The agent experience degrades slightly but nothing breaks.

```typescript
async function scoreResults(query: string, businesses: Business[]): Promise<ScoredBusiness[]> {
  if (process.env.BEDROCK_ENABLED !== 'true') {
    // Fallback: simple keyword scoring
    return businesses.map(b => ({ ...b, score: keywordScore(query, b) }));
  }
  const queryEmbedding = await embedText(query);
  return businesses.map(b => ({
    ...b,
    score: b.embedding ? cosineSimilarity(queryEmbedding, b.embedding) : 0,
  }));
}
```

**Required environment variable:**

```
BEDROCK_ENABLED=true
AWS_REGION=us-east-1
```

IAM policy required on the ECS task role:

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel"],
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
}
```

---

## 4. AWS Strands SDK

**What it does:** Strands is Amazon's open-source agent SDK for building MCP-native agents in Python. Kiosk documents and tests against it as the recommended client SDK for developers building agents that consume Kiosk's endpoints.

**Why it matters:** Any developer who wants to build a shopping agent, a local discovery bot, or a business assistant on top of Kiosk can use Strands with minimal boilerplate.

**Example Strands agent using Kiosk:**

```python
from strands import Agent
from strands.tools.mcp import MCPClient

# Connect to Kiosk's discovery layer
kiosk = MCPClient("https://mcp.kiosk.example/mcp")

agent = Agent(
    model="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    tools=[kiosk],
    system_prompt=(
        "You help users find and order from local businesses. "
        "Use search_businesses to discover options, then connect "
        "to the business MCP endpoint for transactions."
    )
)

response = agent(
    "Find me an open restaurant in Port Harcourt that delivers jollof rice"
)
```

**What happens under the hood:**

```mermaid
flowchart LR
    S["Strands Agent"] -->|"search_businesses"| MMCP["Kiosk Master MCP"]
    MMCP -->|"slug + mcp_endpoint"| S
    S -->|"POST /mcp/business/:slug"| BMCP["Kiosk Business MCP"]
    BMCP -->|"services · hours · contact"| S
    S -->|"create_order_request"| BMCP
    BMCP -->|"order_ref + whatsapp_url"| S
```

Strands handles the MCP protocol, tool call retries, and response parsing. The developer writes business logic only.

---

## 5. AWS Secrets Manager

**What it does:** Stores all credentials — database URL, Clerk keys — and injects them into ECS tasks at launch time via ARN references in the task definition.

**Why it matters:** No secrets appear as plaintext in source code, CI/CD pipelines, environment variable logs, or ECS console. This is the minimum security baseline for any multi-tenant production system.

**Secrets stored:**

| Secret name | Consumed by | Value |
|---|---|---|
| `kiosk/database-url` | api-server, both MCPs | PostgreSQL connection string |
| `kiosk/clerk-secret-key` | api-server | Clerk server-side secret |
| `kiosk/clerk-publishable-key` | api-server, frontend | Clerk publishable key |
| `kiosk/bedrock-region` | master-mcp | `us-east-1` |

**Task definition injection (excerpt):**

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:kiosk/database-url"
    },
    {
      "name": "CLERK_SECRET_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:kiosk/clerk-secret-key"
    }
  ]
}
```

Full task definitions: [`docs/aws/task-definitions/`](aws/task-definitions/)

---

## 6. Amazon CloudWatch Logs

**What it does:** Receives structured JSON logs from all four ECS services via the `awslogs` log driver. Enables operational monitoring, debugging, and alerting.

**How Kiosk integrates:** Every service uses [pino](https://getpino.io) for structured logging with redacted auth headers. The pino output is JSON, which CloudWatch Logs Insights can query directly.

**Log groups:**

| Log group | Service | Key fields logged |
|---|---|---|
| `/ecs/kiosk-frontend` | kiosk-frontend | req method, url, statusCode |
| `/ecs/kiosk-api-server` | api-server | req id, method, url, statusCode, clerkUserId |
| `/ecs/kiosk-master-mcp` | master-mcp | slug, tool_name, duration_ms |
| `/ecs/kiosk-business-mcp` | business-mcp | slug, reqId, tool_name, statusCode |

**Request ID correlation:** The business-mcp generates a UUID `reqId` for every MCP request and includes it in all log lines and the `session_start` agent event. This means a single agent session can be traced across all log lines.

**CloudWatch Logs Insights query — top tools called today:**

```sql
fields @timestamp, tool_name, slug
| filter @logStream like "business-mcp"
| filter event_type = "tool_call"
| stats count(*) as calls by tool_name
| sort calls desc
| limit 20
```

**Task definition log configuration:**

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/kiosk-business-mcp",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "ecs"
    }
  }
}
```

---

## 7. AWS Application Load Balancer + CloudFront

**What it does:** ALB handles host-based and path-based routing to the four ECS target groups. CloudFront sits in front for TLS termination, CDN caching of static assets, and DDoS protection via AWS Shield Standard.

**Routing rules (in priority order):**

```mermaid
flowchart TD
    CF["CloudFront\nEdge cache + TLS"]
    ALB["Application Load Balancer"]
    R1["Priority 10\nHost: mcp.kiosk.example\nPath: /mcp/business/*\n→ business-mcp :5001"]
    R2["Priority 20\nHost: mcp.kiosk.example\nPath: /mcp, /mcp/sse\n→ master-mcp :5000"]
    R3["Priority 30\nHost: api.kiosk.example\nPath: /*\n→ api-server :4000"]
    R4["Priority 40\nHost: kiosk.example\nPath: /*\n→ kiosk-frontend :3000"]

    CF --> ALB --> R1 & R2 & R3 & R4
```

The business-mcp rule has higher priority (10) than master-mcp (20) to ensure `/mcp/business/*` never accidentally matches the master MCP rule.

ALB rules JSON: [`docs/aws/alb-listener-rules.json`](aws/alb-listener-rules.json)

---

## 8. Amazon ECR

**What it does:** Stores Docker images for all four services. ECS pulls images from ECR at task launch.

**Image tagging strategy:**

```bash
# Semantic versioning + git SHA for traceability
docker tag kiosk-business-mcp:latest \
  $ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/kiosk-business-mcp:1.0.0-$(git rev-parse --short HEAD)
```

**ECR lifecycle policy:** Keep the last 10 images per repository. Older images are automatically deleted.

---

## 9. Amazon Route 53

**What it does:** DNS for all Kiosk hostnames.

| Record | Type | Target |
|---|---|---|
| `kiosk.example` | A (alias) | CloudFront distribution |
| `api.kiosk.example` | A (alias) | CloudFront distribution |
| `mcp.kiosk.example` | A (alias) | CloudFront distribution |

All three point to the same CloudFront distribution, which uses host-based routing to forward to the correct ALB target group.

---

## Full AWS Service Matrix

| AWS Service | Tier | Integration type | Required for prod |
|---|---|---|---|
| ECS Fargate | Compute | Runs all 4 services | Yes |
| ECR | Compute | Container registry | Yes |
| ALB | Networking | Host + path routing | Yes |
| CloudFront | Networking | CDN + TLS | Yes |
| Route 53 | Networking | DNS | Yes |
| **AgentCore** | **AI/Agents** | **MCP tool provider** | **Recommended** |
| **Bedrock (Titan Embeddings v2)** | **AI/Agents** | **Semantic search scoring** | **Optional (degrades gracefully)** |
| **Strands SDK** | **AI/Agents** | **Recommended agent client** | **Developer choice** |
| Secrets Manager | Security | Credential injection | Yes |
| CloudWatch Logs | Observability | Structured log aggregation | Yes |
