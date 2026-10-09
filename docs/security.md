# Kiosk Security Model

## Authentication

All business-owner API endpoints require a valid Clerk JWT in the `Authorization: Bearer` header. The `requireAuth` middleware verifies the JWT and extracts `userId` before any route handler runs.

Unauthenticated requests to protected endpoints return HTTP 401.

## Authorization Owner Isolation

Business owners can only read and modify their own businesses. The `assertOwnership(businessId, ownerId)` function queries:

```sql
SELECT * FROM businesses WHERE id = $1 AND owner_clerk_id = $2
```

If no record is found (either the business doesn't exist OR it belongs to a different owner), HTTP 404 is returned not 403. This prevents information leakage about whether a business ID exists.

## MCP Privacy

MCP tool responses never include:
- `owner_clerk_id` not selected in any public-facing query
- Clerk user email or profile data
- Internal system identifiers beyond the public `slug`

Business MCP tools only receive the business data needed for customer-facing responses.

## Discovery Filtering

Unpublished and inactive businesses are excluded at the **SQL layer**, not the application layer:

```sql
WHERE status = 'published' AND is_active = true
```

This applies to all MCP discovery tools and all public marketplace endpoints. No amount of application-layer filtering bugs can expose draft businesses through MCP.

## Input Validation

All REST endpoints validate request bodies against Zod schemas before processing. Invalid input returns HTTP 400 with field-level error details. MCP tools validate input against their registered JSON Schema.

## URL Validation

External MCP endpoint URLs must use `https:`. Registration or update of HTTP URLs returns HTTP 400. This prevents SSRF via non-TLS endpoints and ensures all registered MCP endpoints are encrypted in transit.

## Secrets Management

All credentials (database URL, Clerk keys) are managed via AWS Secrets Manager and injected into ECS tasks by ARN. No secrets appear as plaintext in task definitions, source code, or environment variable logs.

## Known Limitations (MVP)

- Rate limiting is not implemented marked as TODO for production
- No IP allowlisting on MCP endpoints
- No webhook signature verification for external MCP callbacks