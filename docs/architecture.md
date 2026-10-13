# Kiosk — System Architecture

## What Kiosk Is

Kiosk is the **MCP infrastructure layer for local commerce**. Business owners register their business in plain language — no code, no technical knowledge. Kiosk structures that data and provisions a live MCP endpoint for every business. AI agents built on AWS AgentCore, Amazon Alexa+, or any MCP-compatible runtime can then discover, query, and transact with those businesses through a standard protocol interface.

---

## The Core Distinction

**Kiosk is not a centralised API.** It is an infrastructure layer that gives every business its own AI interface.

```mermaid
flowchart LR
    MARKET["Kiosk Master MCP\nthe market — discovery layer"]
    DOOR["Kiosk Business MCP\nthe shop door — each business's own AI interface"]

    AGENT["AI Agent"] --> MARKET
    MARKET -->|"slug + endpoint URL"| DOOR
    DOOR --> BUSINESS["Real local business"]
```

An agent enters through the market, finds the right shop, then walks through the shop door to interact with that specific business. The market and the door are separate services with separate responsibilities.

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Clients
        BO(["🏪 Business Owner\nbrowser"])
        AGENTCORE(["🤖 AWS AgentCore\norchestrated agent"])
        AI(["🔗 Any MCP client\nAlexa+ · Claude · GPT"])
        HU(["👤 Public User\nbrowser"])
    end

    subgraph AWS_ALB["AWS Application Load Balancer + CloudFront"]
        R1["kiosk.example → Frontend"]
        R2["api.kiosk.example → API"]
        R3["mcp.kiosk.example/mcp → Master MCP"]
        R4["mcp.kiosk.example/mcp/business/* → Business MCP"]
    end

    subgraph ECS["AWS ECS Fargate"]
        FE["kiosk-frontend\nNext.js 15  ·  :3000"]
        API["api-server\nExpress  ·  :4000"]
        MMCP["master-mcp\n10 discovery tools  ·  :5000"]
        BMCP["business-mcp\nshared per-tenant runtime  ·  :5001"]
    end

    subgraph AWS_Services["AWS Services"]
        DB[("PostgreSQL\nSupabase / RDS")]
        SM["Secrets Manager"]
        CW["CloudWatch Logs"]
        BR["Amazon Bedrock\nTitan Embeddings v2"]
    end

    CLERK["Clerk Auth"]

    BO --> R1 --> FE
    HU --> R1
    BO --> R2 --> API
    AGENTCORE -->|"MCP tool calls"| R3 --> MMCP
    AGENTCORE -->|"MCP tool calls"| R4 --> BMCP
    AI --> R3
    AI --> R4

    FE <--> CLERK
    API <--> CLERK
    API --> DB
    MMCP --> DB
    MMCP -.->|"semantic search scoring"| BR
    BMCP --> DB
    ECS -.->|"secret injection at launch"| SM
    ECS -.->|"structured JSON logs"| CW
```

---

## AWS AgentCore Integration

AWS AgentCore is Amazon's managed runtime for orchestrating AI agents. Kiosk's MCP servers are designed to be **first-class AgentCore tool providers**.

```mermaid
sequenceDiagram
    participant U as User
    participant AC as AWS AgentCore
    participant M as Kiosk Master MCP
    participant B as Kiosk Business MCP
    participant DB as PostgreSQL

    U->>AC: "Find me jollof rice near Port Harcourt, open now, can deliver"
    AC->>M: tools/call → search_businesses {query, city, open_now: true}
    M->>DB: SELECT WHERE status=published AND is_active=true
    M-->>AC: [{slug:"mamas-kitchen-...", mcp_endpoint, capabilities}]

    AC->>M: tools/call → get_business_endpoint {slug}
    M-->>AC: {endpoint_url: "https://mcp.kiosk.example/mcp/business/mamas-kitchen-..."}

    AC->>B: tools/call → get_services {}
    B->>DB: SELECT FROM business_services WHERE business_id=? AND available=true
    B-->>AC: [{name:"Jollof Rice", price:"₦2500"}, ...]

    AC->>B: tools/call → create_order_request {items, contact_name, contact_phone}
    B->>DB: INSERT INTO agent_events (order intent)
    B-->>AC: {order_ref:"ORD-1749...", whatsapp_url:"https://wa.me/234..."}

    AC-->>U: "Found Mama's Kitchen. Order placed — ref ORD-1749. They'll confirm on WhatsApp."
```

### AgentCore Configuration

AgentCore discovers Kiosk's tools via the Master MCP endpoint. No custom adapter is needed — AgentCore speaks MCP natively.

```json
{
  "agentName": "KioskCommerceAgent",
  "mcpServers": [
    {
      "name": "kiosk-master",
      "endpoint": "https://mcp.kiosk.example/mcp",
      "transport": "streamable-http"
    }
  ],
  "instructions": "You help users find and transact with local businesses. Use search_businesses to discover options, then connect to the business MCP endpoint for transactions."
}
```

Full AgentCore integration guide: [`docs/aws-integrations.md`](aws-integrations.md)

---

## Amazon Bedrock Integration

Kiosk uses **Amazon Bedrock Titan Embeddings v2** to power semantic search in the Master MCP's `search_businesses` tool. Keyword search alone fails when a user asks for "something for my hair" — semantic scoring bridges natural language to structured business data.

```mermaid
flowchart LR
    Q["User query\n'something for my hair'"]
    E1["Titan Embeddings v2\nembed query"]
    E2["Precomputed embeddings\nstored in businesses table"]
    SCORE["Cosine similarity\nscoring"]
    RESULT["Ranked results\nStyleHouse Salon first"]

    Q --> E1
    E1 --> SCORE
    E2 --> SCORE
    SCORE --> RESULT
```

When Bedrock is not available (local dev), Kiosk falls back to `pg_trgm` trigram similarity — no code path breaks.

Full Bedrock integration guide: [`docs/aws-integrations.md`](aws-integrations.md)

---

## Request Flow — Business Owner Onboarding

```mermaid
sequenceDiagram
    participant BO as Business Owner
    participant FE as kiosk-frontend
    participant API as api-server
    participant DB as PostgreSQL
    participant CW as CloudWatch

    BO->>FE: Sign in (Clerk JWT)
    BO->>FE: Fill onboarding form (2 minutes)
    FE->>API: POST /api/businesses
    API->>API: Validate phone, website, whatsapp (Zod schema)
    API->>DB: INSERT businesses + capabilities + services
    API-->>FE: {id, slug, mcpEndpoint}

    BO->>FE: Click "Publish Kiosk"
    FE->>API: PATCH /api/businesses/:id/publish
    API->>API: checkPublishReadiness() — name, location, contact, category
    API->>DB: UPDATE status=published, UPSERT business_endpoints
    API->>CW: structured log {event:"business_published", slug}
    FE-->>BO: "Your business is now AI-discoverable"
    Note over BO,DB: MCP endpoint live within seconds
```

---

## Multi-Tenant Business MCP Runtime

All business tenants share one `business-mcp` process. This is a deliberate design decision — one process per business would not scale.

```mermaid
flowchart TD
    REQ["POST /mcp/business/:slug"]
    RL["Rate limiter\n60 req/min per IP"]
    CACHE{"Session cache\n30s TTL"}
    DB_QUERY["DB: SELECT WHERE\nstatus=published\nAND is_active=true"]
    N404["404 — Business\nnot found"]
    BUILD["buildToolList\nbase tools + capability-gated optional tools"]
    REGISTER["registerBusinessTools\ntools close over session.business.id"]
    CONNECT["server.connect(transport)\nfresh per request"]
    EXEC["Tool handler executes\nall DB queries scoped by business_id"]
    EVENT["INSERT agent_events\nfire-and-forget analytics"]

    REQ --> RL --> CACHE
    CACHE -->|"hit"| BUILD
    CACHE -->|"miss"| DB_QUERY
    DB_QUERY -->|"not found"| N404
    DB_QUERY -->|"found"| BUILD
    BUILD --> REGISTER --> CONNECT --> EXEC --> EVENT
```

---

## Publish Readiness Gate

```mermaid
flowchart TD
    PUB["PATCH /businesses/:id/publish {published: true}"]
    OWN["assertOwnership\nverify caller owns this business"]
    CHK{"checkPublishReadiness\nname · location · contact · category"}
    ERR["422 Unprocessable\n{blocking: ['contact', 'categoryId'],\n recommended: ['description', 'openingHours']}"]
    PROCEED["Status → published\nbusiness_endpoints upserted\nMCP endpoint live"]

    PUB --> OWN --> CHK
    CHK -->|"blocking fields missing"| ERR
    CHK -->|"all required fields present"| PROCEED
```

---

## Components Reference

| Component | Path | Port | Purpose |
|---|---|---|---|
| kiosk-frontend | `artifacts/kiosk-frontend` | 3000 | Business owner UI + public marketplace |
| api-server | `artifacts/api-server` | 4000 | Authenticated REST API — CRUD, analytics, publish gate |
| master-mcp | `artifacts/master-mcp` | 5000 | Discovery MCP — 10 read-only tools, Bedrock-enhanced search |
| business-mcp | `artifacts/business-mcp` | 5001 | Shared per-tenant MCP runtime — capability-scoped tools |
| lib/db | `lib/db` | — | Drizzle ORM schema, migrations, seed data, hours/slug utilities |
| lib/api-zod | `lib/api-zod` | — | Zod validation schemas — phone, website, whatsapp rules |
| lib/api-client-react | `lib/api-client-react` | — | React Query hooks (orval-generated) |

---

## Data Flow — Analytics

```mermaid
flowchart LR
    REST["REST marketplace events\nprofile_view · contact_click · copy_link"]
    MCP["MCP agent events\nsession_start · tool_call · order_request · booking_request"]

    REST --> MPE["marketplace_events table"]
    MCP --> AE["agent_events table"]

    MPE & AE --> ANALYTICS["GET /api/businesses/:id/analytics\n30-day daily breakdown\nMCP session + tool call counts"]
    ANALYTICS --> DASH["Dashboard charts\nAreaChart · PieChart · trend indicators"]
    ANALYTICS --> CW["CloudWatch\noperational metrics"]
```
