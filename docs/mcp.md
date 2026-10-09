# Kiosk  MCP Implementation

## Protocol

- **Version**: 2025-11-25 (minimum)
- **Transport**: Streamable HTTP
- **SDK**: `@modelcontextprotocol/sdk` (official)

## Master MCP  Discovery Server

**Endpoint**: `POST https://mcp.kiosk.example/mcp`  
**Purpose**: Ecosystem-wide business discovery. Read-only. Never executes business operations.

### Tools

| Tool | When to use | Returns |
|------|-------------|---------|
| `discover_categories` | First call understand what business types exist | Array of category objects |
| `search_businesses` | Find businesses by name, product, city, category, open status | Array of matching businesses with mcpEndpoint |
| `get_business` | Get full profile for a specific business by slug | Complete public profile |
| `get_business_capabilities` | Before connecting to Business MCP know what tools will be available | Array of capability keys |
| `get_business_endpoint` | Last step get the Business MCP URL to connect to | `{endpoint_url, transport}` |
| `check_business_status` | Check if a business is currently open | `{is_open, current_day_hours, next_open_at}` |
| `get_business_contact` | Get phone/WhatsApp/website for human fallback | `{phone, whatsapp, whatsapp_url, website}` |
| `get_business_services` | List available services before recommending a booking | Array of services |
| `get_business_products` | List available products before recommending an order | Array of products |
| `get_business_delivery` | Check delivery configuration and coverage | `{enabled, configuration}` |

## Business MCP  Per-Tenant Runtime

**Endpoint**: `POST https://mcp.kiosk.example/mcp/business/:slug`  
**Purpose**: Business-specific capability execution. Scoped to one tenant.

### Base Tools (always present)

| Tool | Purpose |
|------|---------|
| `get_business_info` | Full public profile: name, description, location, hours, timezone |
| `get_services` | All available services with pricing |
| `get_hours` | Opening hours per day + timezone |
| `get_contact` | Phone, WhatsApp URL, website no private data |
| `get_capabilities` | List of enabled capability keys |

### Optional Tools (gated by capability)

| Tool | Required Capability | Purpose |
|------|---------------------|---------|
| `get_products` | `products` | Browse available products with prices |
| `get_delivery_information` | `delivery` | Delivery areas, estimated time, fees |
| `create_order_request` | `ordering` | Submit order intent (no payment, out-of-band confirmation) |
| `request_booking` | `booking` | Submit booking request (no guarantee, out-of-band confirmation) |

## Capability ? Tool Mapping

| Capability | Unlocked Tools |
|------------|---------------|
| menu | (informs context only) |
| products | get_products |
| services | get_services (base) |
| ordering | create_order_request |
| delivery | get_delivery_information |
| booking | request_booking |
| contact | get_contact (base) |
| information | get_business_info (base) |

## Discovery Flow

```
1. discover_categories {}
   ? understand available business types

2. search_businesses { query: "jollof rice", city: "Port Harcourt", open_now: true }
   ? get list with slugs + mcpEndpoints

3. get_business_capabilities { slug: "mamas-kitchen-a1b2c3d4" }
   ? ["menu", "ordering", "delivery", "contact"]

4. get_business_endpoint { slug: "mamas-kitchen-a1b2c3d4" }
   ? { endpoint_url: "https://mcp.kiosk.example/business/mamas-kitchen-a1b2c3d4", transport: "streamable-http" }

5. Connect Business MCP at endpoint_url

6. get_products {}
   ? [{ name: "Jollof Rice", price: "?2500", available: true }, ...]

7. create_order_request { items: [...], contact_name: "...", contact_phone: "..." }
   ? { order_ref: "ORD-...", whatsapp_url: "https://wa.me/...", phone: "..." }
```

## Error Codes

| Code | Meaning |
|------|---------|
| `-32001` | Business not found, unpublished, or inactive |
| `-32002` | Capability not enabled for this business |
| `-32602` | Invalid tool input (JSON Schema validation failure) |

## Security

- `ownerClerkId` is never included in any MCP tool response
- Only `status = 'published' AND is_active = true` businesses are discoverable enforced at SQL layer
- Deactivated businesses stop serving within 30 seconds (one TTL cache cycle)