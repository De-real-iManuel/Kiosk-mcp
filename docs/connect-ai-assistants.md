# Connecting AI Assistants to Kiosk

This guide shows you how to connect the Kiosk Master MCP to any AI assistant that supports the Model Context Protocol. Once connected, the assistant can discover local businesses, check opening hours, browse services, and help users place orders or book appointments — all through natural conversation.

---

## What you are connecting

The Kiosk **Master MCP** is a discovery server running at:

```
https://mcp.kiosk.example/mcp
```

*(Replace with your actual deployed URL, or `http://localhost:5000/mcp` for local development.)*

It exposes 10 read-only tools. You do not need authentication to use it — any published business is publicly discoverable.

---

## Claude Desktop

Claude Desktop supports remote MCP servers through its **Custom Connectors** settings UI. No config file editing required.

### Steps

1. Open Claude Desktop
2. Go to **Settings** → **Connectors** → **Add custom connector**
3. Fill in:
   - **Name:** `Kiosk`
   - **URL:** `https://mcp.kiosk.example/mcp`
   - **Authentication:** None (Kiosk Master MCP is unauthenticated)
4. Click **Save**

Claude will immediately show a tools icon in the chat input. You can now type:

> "Find me an open restaurant in Port Harcourt that delivers jollof rice"

and Claude will call `search_businesses` automatically.

### Local development

Claude Desktop does not connect to plain `http://` URLs. For local testing use the `mcp-remote` bridge:

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json  (macOS)
// %APPDATA%\Claude\claude_desktop_config.json  (Windows)
{
  "mcpServers": {
    "kiosk": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:5000/mcp"
      ]
    }
  }
}
```

Restart Claude Desktop after editing the file.

---

## ChatGPT (OpenAI)

ChatGPT renamed Connectors to **Apps** in December 2025. MCP support requires a **Plus, Pro, or Team** plan with Developer Mode enabled.

### Enable Developer Mode

1. Open ChatGPT → click your profile → **Settings**
2. Under **Beta features**, toggle on **Developer mode**

### Add Kiosk as a custom connector

1. Go to **Settings** → **Apps & Connectors** → **Add connector**
2. Select **Custom connector**
3. Fill in:
   - **Name:** `Kiosk`
   - **MCP Server URL:** `https://mcp.kiosk.example/mcp`
   - **Authentication:** None
4. Click **Save**

ChatGPT will verify the endpoint and list the available tools. You will see a confirmation prompt before any tool call executes.

### Testing locally with ngrok

ChatGPT requires HTTPS. For local testing, expose your local server.

> **Important:** Rebuild master-mcp first after this fix — the server now handles `GET /mcp` correctly which is what ChatGPT checks before accepting the URL.

```bash
# 1. Rebuild with the GET /mcp fix
cd artifacts/master-mcp && pnpm build && pnpm start

# 2. In a separate terminal, expose it
npx ngrok http 5000
```

You will get a URL like:
```
https://parochial-nonemulative-wynona.ngrok-free.dev
```

**The URL to paste into ChatGPT is:**
```
https://parochial-nonemulative-wynona.ngrok-free.dev/mcp
```

The `/mcp` path at the end is required. Do not paste the bare domain — ChatGPT will reject it.

**Why it failed before:** ChatGPT sends a `GET /mcp` request first to probe the server. The old code only had `POST /mcp` registered, so `GET /mcp` returned 404 and ChatGPT rejected the URL as invalid. The fix registers `GET`, `POST`, and `DELETE` on `/mcp`.

---

## Cursor

Cursor reads MCP configuration from a JSON file. It supports remote HTTP servers natively.

### Global config (all projects)

Edit `~/.cursor/mcp.json` (macOS/Linux) or `%USERPROFILE%\.cursor\mcp.json` (Windows):

```json
{
  "mcpServers": {
    "kiosk": {
      "url": "https://mcp.kiosk.example/mcp",
      "type": "http"
    }
  }
}
```

### Project-level config

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "kiosk": {
      "url": "https://mcp.kiosk.example/mcp",
      "type": "http"
    }
  }
}
```

Restart Cursor after saving. You will see Kiosk listed under **Settings → Tools & Integrations → MCP**.

### Local development

```json
{
  "mcpServers": {
    "kiosk-local": {
      "url": "http://localhost:5000/mcp",
      "type": "http"
    }
  }
}
```

Cursor connects to local HTTP directly — no tunnel needed.

---

## AWS AgentCore (Amazon Bedrock)

AgentCore is the recommended production runtime for Kiosk. Configure it in the AWS Console or via CLI.

### AWS Console

1. Open **Amazon Bedrock** → **AgentCore** → **Create agent**
2. Under **MCP Servers**, add:
   - **Name:** `kiosk-discovery`
   - **Endpoint:** `https://mcp.kiosk.example/mcp`
   - **Transport:** `streamable-http`
3. Set the agent instructions (see below)
4. Choose a foundation model — `anthropic.claude-3-5-sonnet-20241022-v2:0` is recommended

### Agent configuration JSON

```json
{
  "agentName": "KioskCommerceAgent",
  "foundationModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "mcpServers": [
    {
      "name": "kiosk-discovery",
      "endpoint": "https://mcp.kiosk.example/mcp",
      "transport": "streamable-http",
      "description": "Discover and search local businesses. Use this first before connecting to a specific business."
    }
  ],
  "agentInstructions": "You help users find and transact with local businesses. Always call search_businesses first to discover options. Check the business status with check_business_status before recommending it. Use get_business_endpoint to get the specific business MCP URL, then connect to it for transactions like order requests and bookings.",
  "idleSessionTTLInSeconds": 900
}
```

---

## Strands Agents (TypeScript)

For developers building their own agents in TypeScript using `@strands-agents/sdk` (v1.0, released April 2026):

```bash
npm install @strands-agents/sdk
```

```typescript
import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { MCPClient } from '@strands-agents/sdk/tools/mcp';

const kiosk = new MCPClient({
  endpoint: 'https://mcp.kiosk.example/mcp',
  transport: 'streamable-http',
});

const agent = new Agent({
  model: new BedrockModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    region: 'us-east-1',
  }),
  tools: [kiosk],
  systemPrompt:
    'You help users find and interact with local businesses. ' +
    'Use search_businesses to discover options, then get_business_endpoint ' +
    'to connect to a specific business for transactions.',
});

const response = await agent.run(
  'Find me a hair salon open now in Lagos and show me their services'
);
console.log(response.output);
```

---

## Kiro

Kiro supports MCP servers through workspace steering files.

Create `.kiro/mcp.json` in your project:

```json
{
  "mcpServers": {
    "kiosk": {
      "url": "https://mcp.kiosk.example/mcp",
      "type": "http"
    }
  }
}
```

Kiro will expose all 10 Kiosk tools to the AI agent during your development sessions.

---

## Any MCP-compatible client

Kiosk's Master MCP uses **Streamable HTTP transport** (MCP spec 2025-03-26+) with a single endpoint:

```
POST https://mcp.kiosk.example/mcp
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

Any client that implements the MCP 2025-03-26 spec or later can connect. The server is unauthenticated — no API keys, no OAuth, no headers required.

---

## Verify the connection

Once connected in any client, run this quick test to confirm all tools are available:

**Prompt:** `List all the tools available from Kiosk`

You should see the assistant return these 10 tools:

| Tool | What it does |
|---|---|
| `discover_categories` | Lists all business categories on the platform |
| `search_businesses` | Finds businesses by name, city, category, or open status |
| `get_business` | Full profile for a specific business |
| `get_business_capabilities` | What the business can do (ordering, booking, delivery, etc.) |
| `get_business_endpoint` | Gets the URL to connect directly to a business's MCP server |
| `check_business_status` | Is the business open right now? |
| `get_business_contact` | Phone, WhatsApp, website |
| `get_business_services` | Services the business offers |
| `get_business_products` | Products the business sells |
| `get_business_delivery` | Delivery configuration and coverage |

---

## What to try first

Once connected, these prompts demonstrate the full Kiosk capability:

```
Find me an open restaurant in Port Harcourt that delivers food
```

```
Is StyleHouse Salon open right now? Show me their services and prices.
```

```
Find a phone repair shop in Lagos, check if they're open, and get their contact details.
```

```
I want to order jollof rice and chicken from Mama's Kitchen in Port Harcourt.
```

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| "No tools found" or empty tools list | Server not running | Start `master-mcp` with `pnpm build && pnpm start` |
| Claude Desktop won't connect to `http://` | HTTP not allowed | Use `mcp-remote` bridge or deploy to HTTPS |
| ChatGPT says "Could not reach server" | HTTPS required | Use ngrok or a deployed URL |
| Tools appear but return empty results | No published businesses in DB | Seed demo data: `cd lib/db && npx tsx src/seed/index.ts` |
| 404 on the endpoint | Wrong URL path | Confirm URL ends in `/mcp` not `/mcp/` or just the domain |
| `search_businesses` returns nothing | Search terms too specific | Try a city name alone first: `{city: "Port Harcourt"}` |
