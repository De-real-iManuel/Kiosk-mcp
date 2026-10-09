# Kiosk System Architecture

## What is Kiosk?

Kiosk is an AI-facing discovery infrastructure for the real-world business ecosystem. Business owners register their business in plain language; Kiosk structures that data and provisions a business-specific MCP endpoint. AI agents use the Master MCP to discover businesses, then interact with each business via its own MCP interface.

## The Fundamental Distinction

**Kiosk is NOT a centralised marketplace API.**

```
Kiosk    = the discovery layer  (the market)
Business MCP = each business's own AI interface  (the individual shop door)
```

An AI agent enters through the market (Master MCP), finds the right shop (discovery), then walks through the shop door (Business MCP) to interact with that specific business.

## Architecture Diagram

```mermaid
graph TB
    subgraph Clients
        BO[Business Owner]
        AI[AI Agent / Alexa+]
        HU[Human Browser]
    end

    subgraph AWS ECS Fargate
        FE[kiosk-frontend :3000]
        API[api-server :4000]
        MMCP[master-mcp :5000]
        BMCP[business-mcp :5001]
    end

    subgraph Data
        DB[(PostgreSQL / Supabase)]
    end

    CLERK[Clerk Auth]

    BO --> FE --> API --> DB
    AI -->|POST /mcp| MMCP --> DB
    AI -->|POST /mcp/business/:slug| BMCP --> DB
    API <--> CLERK
    FE <--> CLERK
    HU --> FE
```

## Components

| Component | Path | Port | Purpose |
|-----------|------|------|---------|
| kiosk-frontend | artifacts/kiosk-frontend | 3000 | Business owner UI + public marketplace |
| api-server | artifacts/api-server | 4000 | Authenticated REST API (CRUD + discovery) |
| master-mcp | artifacts/master-mcp | 5000 | AI-facing discovery MCP (read-only, 10 tools) |
| business-mcp | artifacts/business-mcp | 5001 | Shared business MCP runtime (tenant-routed) |
| lib/db | lib/db |   | Drizzle ORM, schema, migrations, seed |
| lib/api-zod | lib/api-zod |   | Zod validation schemas |
| lib/api-client-react | lib/api-client-react |   | React Query hooks |

## Request Flow AI Agent Discovery

```mermaid
sequenceDiagram
    participant Agent as AI Agent
    participant MMCP as Master MCP
    participant BMCP as Business MCP
    participant DB as PostgreSQL

    Agent->>MMCP: discover_categories
    MMCP->>DB: SELECT categories
    MMCP-->>Agent: [{id, name, slug}]
    Agent->>MMCP: search_businesses {query, city, open_now}
    MMCP->>DB: SELECT published+active businesses
    MMCP-->>Agent: [{slug, mcpEndpoint, capabilities[]}]
    Agent->>MMCP: get_business_endpoint {slug}
    MMCP-->>Agent: {endpoint_url, transport}
    Agent->>BMCP: POST /mcp/business/mamas-kitchen
    BMCP->>DB: resolveBusinessSession(slug)
    BMCP-->>Agent: tools scoped to capabilities
    Agent->>BMCP: create_order_request {items, contact}
    BMCP-->>Agent: {order_ref, whatsapp_url}
```

## Request Flow Business Owner Onboarding

```mermaid
sequenceDiagram
    participant BO as Business Owner
    participant FE as Frontend
    participant API as api-server
    participant DB as PostgreSQL

    BO->>FE: Sign in (Clerk)
    BO->>FE: Fill onboarding form
    FE->>API: POST /api/businesses
    API->>DB: INSERT business + capabilities + products
    API-->>FE: {id, slug, mcpEndpoint}
    BO->>FE: Click Publish
    FE->>API: PATCH /api/businesses/:id/publish
    API->>DB: UPDATE status=published, INSERT business_endpoints
    FE-->>BO: "Your business is now AI-discoverable"
```

## Multi-Tenant Business MCP

All business tenants share one `business-mcp` process. Routing happens by slug:

```
POST /mcp/business/mamas-kitchen     ? Mama's Kitchen session
POST /mcp/business/stylehouse-salon  ? StyleHouse Salon session
POST /mcp/business/techfix-solutions ? TechFix Solutions session
```

Each request: resolves business from DB (with 30s TTL cache) ? builds session-scoped tool list based on enabled capabilities ? handles MCP request ? records analytics event.

## External MCP Support

A business with its own MCP server can register its endpoint URL via the dashboard. Kiosk stores it in `business_endpoints` and `get_business_endpoint` returns the external URL instead of the hosted Kiosk URL. The business retains full ownership of its own MCP interface.