# Kiosk  Testing

## Test Commands

| Command | What it tests |
|---------|--------------|
| `pnpm --filter @workspace/db typecheck` | DB schema + utilities |
| `pnpm --filter @workspace/api-zod typecheck` | Zod schemas |
| `pnpm --filter @workspace/api-server typecheck` | API server |
| `pnpm --filter @workspace/master-mcp typecheck` | Master MCP server |
| `pnpm --filter @workspace/business-mcp typecheck` | Business MCP runtime |
| `pnpm e2e` | Full E2E agent discovery flow |

## E2E Test Flow

The E2E test (`scripts/e2e-agent-flow.ts`) validates the complete stack:

```
1. Connect to Master MCP at http://localhost:5000/mcp
2. discover_categories ? assert =1 category
3. search_businesses { query: "jollof rice", city: "Port Harcourt" }
   ? assert Mama's Kitchen appears
4. get_business_endpoint { slug } ? assert {endpoint_url, transport}
5. Connect Business MCP at endpoint_url
6. get_capabilities ? assert "ordering" and "delivery" present
7. get_products ? assert =1 product
8. create_order_request ? assert order_ref + whatsapp_url returned
```

## Running Locally

```bash
# 1. Set up database
pnpm --filter @workspace/db push
pnpm --filter @workspace/db seed

# 2. Start services (3 terminals)
pnpm --filter @workspace/api-server dev
pnpm --filter @workspace/master-mcp start
pnpm --filter @workspace/business-mcp start

# 3. Run E2E test
pnpm e2e
```

## What the E2E Test Verifies

- Master MCP starts and serves protocol version 2025-11-25
- `discover_categories` returns seeded categories
- `search_businesses` finds Mama's Kitchen by product name
- `get_business_endpoint` returns a valid Streamable HTTP URL
- Business MCP resolves the correct tenant by slug
- Capability-scoped tools are exposed (ordering, delivery for Mama's Kitchen)
- `create_order_request` records intent and returns contact info
- Discovery excludes inactive businesses (deactivation test)