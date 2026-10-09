# Kiosk Business MCP Runtime

## The Shared Runtime Model

A naive implementation would spawn one Node.js process per business. This doesn't scale 1,000 businesses would require 1,000 processes, each consuming RAM and a database connection.

Kiosk uses a **shared runtime**: one `business-mcp` process handles all tenants simultaneously. Business identity is determined by the URL path, not the process.

```
One process handles:
  POST /mcp/business/mamas-kitchen
  POST /mcp/business/stylehouse-salon
  POST /mcp/business/techfix-solutions
  ... (unlimited tenants)
```

## Slug-Based Routing

```typescript
app.post('/mcp/business/:slug', async (req, res) => {
  const slug = req.params.slug
  const session = await resolveBusinessSession(slug)
  const server = createBusinessMcpServer(slug)
  registerBusinessTools(server, session)   // capability-scoped
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})
```

A fresh MCP server + transport is created per request. The per-request cost is minimal; the expensive part (DB query) is cached.

## Session Resolution

`resolveBusinessSession(slug)` works as follows:

```
1. Check in-memory cache (Map<slug, {session, expiresAt}>)
   ? cache hit: return session immediately (no DB round-trip)
   ? cache miss: continue

2. Query businessesTable WHERE slug = ? AND status = 'published' AND is_active = true
   ? not found: throw 404 error
   ? found: continue

3. Query businessCapabilitiesTable WHERE businessId = ? AND enabled = true
   ? get list of enabled capabilities

4. Build BusinessSession: { business, capabilities, enabledCapabilityKeys }

5. Store in cache with expiresAt = Date.now() + 30_000

6. Return session
```

## buildToolList Algorithm

```typescript
function buildToolList(enabledCapabilityKeys: string[]): string[] {
  const capSet = new Set(enabledCapabilityKeys)
  const optional = OPTIONAL_TOOLS.filter(t => capSet.has(t.requiredCapability))
  return [...BASE_TOOLS, ...optional.map(t => t.name)]
}
```

This ensures:
- All 5 base tools are always registered
- Only tools whose capability is enabled are added
- A business without `ordering` never has `create_order_request`
- A business without `products` never has `get_products`

## Cache Invalidation

The TTL is 30 seconds. This means:
- A newly published business becomes discoverable within 30 seconds
- A deactivated business stops serving within 30 seconds
- No manual cache invalidation is needed for normal lifecycle events

For immediate invalidation (e.g. emergency takedown), restart the `business-mcp` service.

## External MCP Registration

When a business registers an external MCP server:

1. Owner provides external URL via dashboard
2. API validates: must be HTTPS
3. Stored in `business_endpoints.endpoint_url` with `transport = 'streamable-http'`
4. `get_business_endpoint` on the Master MCP returns the external URL
5. The Kiosk-hosted Business MCP runtime is NOT involved for externally-hosted endpoints
6. Kiosk remains the discovery layer; the business owns its interface