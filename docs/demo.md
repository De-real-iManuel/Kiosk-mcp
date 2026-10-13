# Kiosk — Hackathon Demo Guide

## The Story

Local businesses in emerging markets — a jollof rice restaurant in Port Harcourt, a hair salon in Lagos, a phone repair shop in Abuja — are completely invisible to AI agents today. There is no standard way for an Amazon Alexa+ assistant or a Claude agent to ask "what's open near me that delivers food?" and get a structured, actionable answer.

Kiosk fixes this at the infrastructure layer. Every business that signs up gets a live MCP endpoint — automatically, immediately, with no code.

---

## Demo Scenario

**"Find me jollof rice near me, open now, and place an order."**

This single user request exercises the entire Kiosk stack:

1. Master MCP discovery (search across all published businesses)
2. Open-status check (timezone-aware hours algorithm)
3. Business MCP connection (tenant-routed per-slug)
4. Order intent capture (with WhatsApp confirmation URL)

---

## Prerequisites

```bash
# Clone and install
git clone <repo-url> && cd kiosk-agent-commerce
pnpm install

# Configure env (fill in DATABASE_URL + Clerk keys)
cp .env.example .env

# Database setup
cd lib/db && npx drizzle-kit push && npx tsx src/seed/index.ts

# Start all services (4 terminals)
cd artifacts/api-server     && pnpm build && pnpm start   # :4000
cd artifacts/business-mcp   && pnpm build && pnpm start   # :5001
cd artifacts/master-mcp     && pnpm build && pnpm start   # :5000
cd artifacts/kiosk-frontend && pnpm dev                   # :3000
```

---

## Part 1 — Business Owner Onboarding (2 minutes)

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign up with any email via Clerk
3. Click **Create your Kiosk**
4. Fill in the form:
   - Business name: `Mama's Kitchen`
   - Category: `Restaurant`
   - Description: `Home-style Nigerian food. Jollof rice, soups, and grills.`
   - City: `Port Harcourt`
   - Phone: `+2348012345678`
   - WhatsApp: `2348012345678`
   - Opening hours: Mon–Sat 08:00–22:00
5. Click **Save draft**
6. Click **Publish Kiosk**

The dashboard shows:

```
AI-readable business presence — ACTIVE
http://localhost:5001/mcp/business/mamas-kitchen-XXXXXXXX
```

That's it. The business is now AI-discoverable.

---

## Part 2 — AI Agent Discovery (curl demo)

Run these commands in order to simulate exactly what AWS AgentCore does:

```bash
# Get the slug from your dashboard, then set it:
SLUG="mamas-kitchen-XXXXXXXX"

# Step 1: Discover categories
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"discover_categories","arguments":{}}}' \
  | jq '.result.content[0].text | fromjson | .[].name'
# → "Restaurant", "Salon & Beauty", "Electronics & Repairs", ...

# Step 2: Search for jollof rice
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"search_businesses\",\"arguments\":{\"query\":\"jollof rice\",\"city\":\"Port Harcourt\"}}}" \
  | jq '.result.content[0].text | fromjson | .[0] | {name, slug, mcp_endpoint}'
# → { "name": "Mama's Kitchen", "slug": "mamas-kitchen-...", "mcp_endpoint": "http://localhost:5001/mcp/business/..." }

# Step 3: Check if it's open right now
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"check_business_status\",\"arguments\":{\"slug\":\"$SLUG\",\"iso_time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}}" \
  | jq '.result.content[0].text | fromjson'
# → { "is_open": true, "current_day_hours": { "open": "08:00", "close": "22:00" } }

# Step 4: Get the Business MCP endpoint
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"get_business_endpoint\",\"arguments\":{\"slug\":\"$SLUG\"}}}" \
  | jq '.result.content[0].text | fromjson'
# → { "endpoint_url": "http://localhost:5001/mcp/business/mamas-kitchen-...", "transport": "streamable-http" }

# Step 5: Connect to Business MCP — list tools
curl -s -X POST http://localhost:5001/mcp/business/$SLUG \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/list","params":{}}' \
  | jq '[.result.tools[].name]'
# → ["get_business_info","get_services","get_hours","get_contact","get_capabilities"]

# Step 6: Get the menu
curl -s -X POST http://localhost:5001/mcp/business/$SLUG \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"get_services","arguments":{}}}' \
  | jq '.result.content[0].text | fromjson'

# Step 7: Get contact info
curl -s -X POST http://localhost:5001/mcp/business/$SLUG \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_contact","arguments":{}}}' \
  | jq '.result.content[0].text | fromjson'
# → { "phone": "+2348012345678", "whatsapp_url": "https://wa.me/2348012345678", "website": null }
```

---

## Part 3 — AWS AgentCore Integration

With an AgentCore agent configured against Kiosk's Master MCP, the entire flow above happens automatically from a single user message.

**Create the agent in AWS Console:**

```json
{
  "agentName": "KioskCommerceAgent",
  "foundationModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "mcpServers": [{
    "name": "kiosk",
    "endpoint": "https://mcp.kiosk.example/mcp",
    "transport": "streamable-http"
  }],
  "agentInstructions": "Help users find and order from local businesses. Use search_businesses first, check is_open status, then connect to the business MCP endpoint for transactions."
}
```

**Test the agent:**

> "Find me an open restaurant in Port Harcourt that delivers jollof rice and place an order for 2 portions."

AgentCore will automatically call `search_businesses`, `check_business_status`, connect to the Business MCP, call `get_services`, then `create_order_request` — returning the order reference and WhatsApp confirmation link.

---

## Part 4 — Strands SDK Integration

For developers building their own agents on top of Kiosk:

```python
from strands import Agent
from strands.tools.mcp import MCPClient

kiosk = MCPClient("https://mcp.kiosk.example/mcp")
agent = Agent(
    model="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    tools=[kiosk],
    system_prompt="You help users find and order from local businesses."
)

result = agent("Find me jollof rice near Port Harcourt, open now")
print(result)
```

---

## What the Demo Proves

| Claim | How demonstrated |
|---|---|
| Any business can join in 2 minutes | Live onboarding walkthrough |
| MCP endpoint is live immediately after publish | Dashboard shows URL; curl verifies it returns tools |
| AI agents can discover and transact without custom integrations | Full curl discovery flow from categories to order |
| AWS AgentCore works natively with Kiosk | AgentCore config + live agent test |
| Multi-tenant isolation | Two businesses, two slugs, two different tool responses |
| Timezone-aware open/closed status | `check_business_status` with current UTC time |

---

## Demo Video Outline (under 3 minutes)

| Time | Action |
|---|---|
| 0:00–0:15 | The problem: AI agents can't find local businesses |
| 0:15–0:50 | Business owner fills form and clicks Publish — MCP URL appears |
| 0:50–1:30 | Terminal: curl through the full discovery flow, step by step |
| 1:30–1:50 | AgentCore: single user message → full order placed |
| 1:50–2:10 | Architecture diagram — ECS, Bedrock, AgentCore, Secrets Manager |
| 2:10–2:30 | Dashboard analytics: views, contacts, MCP tool calls charted |
| 2:30–2:50 | "Any business. Any AI agent. No infrastructure expertise needed." |
