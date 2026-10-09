# Kiosk Demo Guide

## Demo Scenario: "Find me jollof rice near me, open now, able to deliver"

This is the core Kiosk demo. It shows a complete AI agent journey from discovery to order placement.

## Prerequisites

```bash
# Install dependencies
pnpm install

# Set up .env with DATABASE_URL and Clerk keys
# Run migration and seed
pnpm --filter @workspace/db push
pnpm --filter @workspace/db seed

# Start all services (4 terminals)
pnpm --filter @workspace/api-server dev        # port 4000
pnpm --filter @workspace/master-mcp start      # port 5000
pnpm --filter @workspace/business-mcp start    # port 5001
pnpm --filter @workspace/kiosk-frontend dev    # port 3000
```

## Part 1 Business Owner Onboarding

1. Open http://localhost:3000
2. Sign up as a business owner
3. Click "Add Business"
4. Fill in: Name="Mama's Kitchen", Category=Restaurant, City=Port Harcourt
5. Add products: Jollof Rice ?2500, Fried Rice ?2500, Chicken ?1500
6. Enable capabilities: Menu, Ordering, Delivery, Contact
7. Click Publish
8. Dashboard shows:
   ```
   Your business is now AI-discoverable.
   MCP URL: https://mcp.kiosk.example/business/mamas-kitchen-XXXXXXXX
   [Copy]
   ```

## Part 2 AI Agent Discovery (curl)

```bash
# Step 1: Discover categories
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"discover_categories","arguments":{}}}'

# Step 2: Search for jollof rice
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_businesses","arguments":{"query":"jollof rice","city":"Port Harcourt","open_now":true,"local_time":"2024-01-15T13:00:00Z"}}}'

# Step 3: Get MCP endpoint
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_business_endpoint","arguments":{"slug":"mamas-kitchen-XXXXXXXX"}}}'

# Step 4: Connect to Business MCP and place order
curl -X POST http://localhost:5001/mcp/business/mamas-kitchen-XXXXXXXX \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"create_order_request","arguments":{"items":[{"product_name":"Jollof Rice","quantity":2}],"contact_name":"Demo User","contact_phone":"+2348000000000"}}}'
```

## Part 3 Automated E2E Test

```bash
pnpm e2e
```

Expected output:
```
[1] Connecting to Master MCP...
[2] discover_categories: 10 categories found
[3] search_businesses: Mama's Kitchen found (slug: mamas-kitchen-...)
[4] get_business_endpoint: https://mcp.kiosk.example/business/mamas-kitchen-...
[5] Connecting to Business MCP...
[6] get_capabilities: ["menu","ordering","delivery","contact"]
[7] get_products: 6 products available
[8] create_order_request: order_ref=ORD-... whatsapp_url=https://wa.me/...
? Full E2E agent flow passed
```

## Demo Video Outline (< 3 minutes)

1. (0:00) Show the problem: "How does an AI agent find Mama's Kitchen?"
2. (0:20) Business owner fills onboarding form � plain language, no technical knowledge
3. (0:45) Click Publish MCP URL appears on dashboard
4. (1:00) Switch to terminal show Master MCP discovery in real time
5. (1:30) Agent finds Mama's Kitchen, gets endpoint, connects Business MCP
6. (1:50) Agent places order returns WhatsApp URL for out-of-band confirmation
7. (2:10) Show the architecture diagram briefly
8. (2:30) "Any business. Any AI agent. No infrastructure expertise required."