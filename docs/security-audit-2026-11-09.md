# Kiosk security review — 9 November 2026

## Scope and method

Code-level review of the internal admin dashboard, Master MCP, Business MCP, API server and relevant frontend paths on `feature/internal-admin-foundation`. This is not a penetration test, infrastructure scan or proof of production configuration. KCIRON is explicitly out of scope.

## Changes made in this review

### Master MCP
- Added a 120-request/minute per-IP limiter to GET, POST and DELETE `/mcp`.
- Set an explicit 64 KiB JSON request-body limit.
- Configured Express to trust one ingress proxy hop, matching the current ALB deployment assumption.
- Replaced the default pino-http request serializer. Request logs now keep only request ID, method and path; authorization headers, cookies, query strings and bodies are not serialized.

### Business MCP
- Kept the existing 60-request/minute MCP limit and changed its client key to Express `req.ip`, resolved using the configured one-hop ALB trust.
- Added a 10,000-entry cap to the in-process limiter map.
- Set an explicit 64 KiB JSON request-body limit.
- Removed the 30-second business-session cache. Published/active status and enabled capabilities are now resolved from the database for each request, avoiding a stale authorization window after suspension or capability revocation.

### API and admin authentication
- Replaced reflected credentialed CORS (`origin: true`) with an exact origin allowlist. Configure `CORS_ALLOWED_ORIGINS` as a comma-separated list of exact browser origins. The code fallback is localhost plus the current Kiosk CloudFront origin.
- Set JSON and URL-encoded body limits to 32 KiB.
- Configured one trusted proxy hop and changed API limiter identity to `req.ip`; capped limiter memory at 10,000 entries.
- Added a separate 30-request/minute limit to admin API routes before Cognito verification and database lookup.
- Added a 10-second per-issuer cooldown for unknown JWT key-ID JWKS refreshes to prevent arbitrary `kid` values from causing a fetch on every request.
- Added bounded validation for merchant onboarding feedback: known fields only, string values only, and per-field character limits.
- Added a dedicated 30-request/minute admin API limit and no-store response headers for privileged admin routes.
- Throttled unknown-kid JWKS refreshes per issuer to reduce key-lookup amplification.
- Bounded Master MCP search, slug, category and time inputs; invalid open-now timestamps are rejected.
- Bounded Business MCP order/booking payloads (items, quantities, names, phone numbers, notes and addresses); booking times are checked against a 24-hour clock.
- Added baseline frontend response headers: nosniff, strict-origin referrer policy and a restrictive Permissions-Policy.

### Internal dashboard
- Applied Kiosk burnt orange (`#D96845`, with `#E8A18D` as the lighter accent) to the primary sign-in action, selected navigation states and refresh/sign-out focus and hover states.
- The dashboard renders server data through React text nodes; no raw HTML rendering was found in this component.
- Admin sign-out now redirects through the Cognito Hosted UI logout endpoint instead of only clearing React state; a sign-out control is also available in the mobile header.

### CI
- Corrected the changed-file Prettier invocation to pass the filename array directly, rather than piping a potentially non-NUL-delimited list to `xargs -0`.

## Controls observed in the reviewed code

- Admin routes use a separate Cognito access-token verifier (RS256 signature, configured issuer, access-token use, app-client ID, expiry and optional not-before) and require a matching active, explicitly provisioned admin subject in the database.
- Admin route permissions are enforced server-side. Merchant Clerk authentication is not used as admin authorization.
- Merchant business routes require Clerk authentication. Detail, readiness, update, publish, feedback, booking and delete operations check ownership; analytics queries include the authenticated owner ID.
- Admin businesses and telemetry endpoints select limited fields. Support, incident, feedback and audit records are behind their respective admin permissions.
- No file-upload input, upload route, S3 upload client or presigned-upload flow was found in the reviewed repository search. There is currently no upload surface to harden.
- The shared chart component contains a `dangerouslySetInnerHTML` use to emit generated CSS. No call sites were found in the code search. Keep its configuration trusted; validate CSS variable keys and color values before using data that can be influenced by merchants or other users.
- Admin API responses now explicitly use `Cache-Control: no-store, private` and `Pragma: no-cache`.
- API and Business MCP request log serializers omit headers. Master MCP now does the same.

## Remaining risks and rollout requirements

1. **Proxy trust is an infrastructure assumption.** `trust proxy = 1` is safe only when the service can be reached through the intended single ALB hop. Verify the ECS task security group accepts ingress only from the ALB security group; direct public task ingress would let clients spoof forwarded headers and bypass IP-based controls.
2. **Rate limits are process-local.** They protect each running process and have bounded memory, but are not shared across ECS tasks or restarts. Add AWS WAF/edge throttling or a shared Redis-backed limiter before relying on a global quota or scaling out.
3. **CORS configuration must match deployment.** Set `CORS_ALLOWED_ORIGINS` to every exact production frontend origin (scheme + hostname, no path). If the frontend moves from the current CloudFront hostname to a custom domain, update this environment variable.
4. **Admin identity is not provisioned by this code change.** Cognito User Pool/app-client configuration, exact callback and logout URLs, disabled public self-signup, MFA enforcement, and out-of-band admin subject provisioning still need to be completed and tested in staging. The frontend OIDC domain, client ID and callback URI must be supplied as build-time public environment variables; no client secret belongs in the browser bundle.
5. **Content Security Policy remains open.** Baseline browser headers are now set by Next.js, but a tested CSP and HSTS policy still need deployment review at the frontend/CloudFront layer without breaking Clerk's required scripts, connections and frames.
6. **No production rollout was performed.** No production database schema push, Cognito changes, ECS deployment or infrastructure security-group change was made.
7. **Validation status:** CI is triggered on branch updates. Record final typecheck, tests, builds, MCP health and Docker build outcomes after the latest commit completes; do not treat earlier/cancelled runs as evidence for the final head.

## Operational note

The Master and Business MCP endpoints are public discovery surfaces. Rate limiting is abuse control, not authentication. Keep tools least-privileged, validate every tool input, and do not expose private merchant/customer data through discovery results.
