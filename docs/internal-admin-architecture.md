# Internal Admin, MCP Telemetry, and Client Identity

Status: foundation design and persistence schema. This document does not claim that an admin UI, production authorization, or vendor-verified AI identity is deployed.

## Security boundary

The internal admin application is a separate trust domain from merchant accounts and the public Marketplace. Merchant Clerk sessions are not admin credentials. Public signup is disabled. Every admin API route must authenticate a trusted workforce identity and then resolve an active `admin_users` record; all routes default to deny.

Recommended first-party workforce identity: AWS IAM Identity Center (or Amazon Cognito if Kiosk needs a dedicated app-user pool). Use OIDC authorization-code flow with PKCE, MFA, short-lived sessions, and an explicit email/subject allowlist provisioned out of band. Persist only the provider issuer and immutable subject in `admin_users`; do not authorize by email domain alone. Map the database role to permissions on the server.

AWS KMS is useful for signing audit exports, signing short-lived service assertions, and protecting secrets. It is not by itself a human login system. A KMS key whose private operation is available only to the backend proves that the backend used the key, not which human administrator initiated the request. Do not create a shared KMS-signed login code as a substitute for identity-provider authentication. If a future passwordless hardware-key flow is desired, use WebAuthn/passkeys with per-admin credentials and challenge verification; KMS can protect server-side key material but should not replace WebAuthn.

## Roles and permission model

Initial roles: `super_admin`, `technical_admin`, `support_agent`, `verification_reviewer`.

- `super_admin`: all administrative permissions, including provisioning admins.
- `technical_admin`: telemetry, diagnostics, incidents, and service health; no business suspension or verification decisions by default.
- `support_agent`: read-only business inspection, support tickets, internal notes; no sensitive business state changes.
- `verification_reviewer`: verification decisions only, with reason and audit record.

Use explicit permissions such as `business.read`, `business.suspend`, `business.publish.override`, `verification.decide`, `support.manage`, `telemetry.read`, `incident.manage`, and `admin.manage`. A route must check permission server-side. Never infer privileges from frontend navigation or Clerk merchant metadata.

## AI client identity: what can and cannot be proven

MCP client metadata (`clientInfo.name`, version), HTTP User-Agent, and protocol headers are self-asserted and can be spoofed. Store them as observed metadata with an identity status of `unknown` or `inferred`, not as vendor verification.

OAuth authenticates an account/user or client according to the issuer's token semantics. DPoP or mTLS can prove possession of a key by the caller, but does not by itself prove that the caller is ChatGPT or Claude. A customer-controlled OAuth client can claim a vendor name.

Only mark a vendor identity `verified` when Kiosk validates a cryptographically verifiable assertion issued by that vendor (or a trusted identity broker) with documented audience, issuer, signature, expiry, and key-rotation rules. Do not invent vendor keys, trust a client-supplied public key, or infer vendor identity from IP ranges. Until a vendor offers such a supported mechanism, report client names as inferred/unknown and keep signed client registrations as a separate Kiosk-controlled identity class.

For optional authenticated integrations, issue credentials to registered integrations and store a credential/client ID, never the raw secret. Use OAuth authorization-code + PKCE for user-authorized connections, or client credentials/private-key JWT for service integrations where supported. Rotate and revoke credentials. These credentials prove the registered integration identity, not necessarily the AI model vendor.

## Telemetry semantics

- `mcp_request_events`: one row per inbound HTTP request to an MCP endpoint, including initialize, tools/list, tools/call, probes, and session termination. It is not equivalent to one user prompt or one AI conversation.
- `mcp_tool_events`: one row per executed tool handler, including success/failure and duration.
- Existing `agent_events`: retain business-domain events such as order and booking requests. Avoid using it as the sole source of platform request counts.
- Existing `marketplace_events`: retain public profile interaction analytics.

Do not call POST requests "sessions". Stateless MCP can send multiple independent HTTP requests; a request count is not a unique assistant, person, conversation, or customer count. Unique clients are estimates unless an authenticated stable client identifier exists.

Never store Authorization headers, bearer tokens, cookies, full prompts, full tool arguments, contact details, or raw request bodies in telemetry. Record only allowlisted metadata: MCP method, tool name, observed client name/version, protocol version, status, duration, request size, and business ID where applicable. Apply retention/aggregation before high-volume production use.

## Database rollout

The Drizzle schema is the source of truth. After review, run the workspace's normal schema push from a controlled environment with the intended DATABASE_URL:

```sh
pnpm --filter @workspace/db push
```

Do not run schema push against production without a reviewed backup, a staging validation, and an approved deployment window. The current repository uses `drizzle-kit push`; it does not yet have a checked-in migration workflow for these tables.

## Next implementation gates

1. Add and test request/tool telemetry instrumentation in both MCP services.
2. Build a dedicated admin API with OIDC verification and role/permission middleware.
3. Add audited business state-change services; no direct unlogged writes from UI.
4. Build admin screens only after API permissions and telemetry semantics are tested.
5. Add retention/partitioning/aggregation based on observed traffic volume.

## Implemented admin API and console scaffold

The API server now mounts a separate `/api/admin` router. It does not use Clerk's merchant identity as an authorization grant. Admin requests require a Cognito User Pool access token in the Authorization Bearer header, validated against the configured issuer's JWKS and the configured app-client ID. The token must have `token_use=access`; the immutable `sub` and issuer must match an active row in `admin_users`. There is no self-registration or email-domain fallback.

Required API environment:
- `ADMIN_OIDC_ISSUER`: exact Cognito User Pool issuer, e.g. `https://cognito-idp.<region>.amazonaws.com/<user-pool-id>`.
- `ADMIN_OIDC_AUDIENCE`: Cognito app client ID. Cognito access tokens carry this as `client_id`.

Required frontend environment:
- `NEXT_PUBLIC_ADMIN_OIDC_DOMAIN`: Cognito hosted UI domain, e.g. `https://<prefix>.auth.<region>.amazoncognito.com`.
- `NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID`: same public app client ID.
- `NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI`: exact registered callback, e.g. `https://<kiosk-host>/internal-admin`.
- `NEXT_PUBLIC_API_URL`: existing API origin.

Configure the Cognito app client as a public client with no client secret, authorization-code grant, PKCE S256, and only the `openid email profile` scopes. Register the exact redirect URI. Disable public self-signup and require MFA in the user pool. Provision each operator out-of-band and add their `sub`, exact issuer, email, role, and active status to `admin_users`. Do not activate a user by email alone.

The browser obtains a short-lived access token through the hosted UI authorization-code + PKCE flow and keeps it in memory only. Reloading the page requires signing in again; no refresh token or long-lived browser storage is used. The frontend console lives at `/internal-admin`; the page itself contains no admin data until the API validates the token and resolves the provisioned admin record.

Initial read APIs:
- `GET /api/admin/me`: current provisioned admin and effective permissions.
- `GET /api/admin/overview`: 24-hour/7-day MCP request and tool counts, published business count, top observed clients/tools, recent tool errors.
- `GET /api/admin/telemetry/requests` and `/api/admin/telemetry/tools`: request and tool-event views.
- `GET /api/admin/businesses`, `/api/admin/tickets`, `/api/admin/incidents`, and `/api/admin/audit`: role-gated operational views.

These are read-only foundations. Business suspension, publish overrides, verification decisions, ticket mutations, incident updates, and admin provisioning are intentionally not exposed until their service-layer validation and mandatory audit writes are implemented. The dashboard hides sections the current role cannot access, while the API independently enforces every permission. The current browser token exchange and API authorization have not yet been integration-tested against a real Cognito pool.

## Remaining implementation gates

1. Configure a dedicated Cognito user pool/app client and provision the first operator out of band.
2. Add tests for JWT signature, issuer, app-client ID, expiry, token type, key rotation, inactive users, and role permissions.
3. Run workspace typecheck/build and resolve any compile issues.
4. Add write services that atomically persist business/support/incident state changes and audit events.
5. Apply the schema in staging only, then verify dashboard data against real MCP traffic.
6. Add retention/aggregation and operational alerts before high-volume production use.

## Feedback form storage and admin visibility

The merchant dashboard's pre-publication feedback form calls `POST /api/businesses/:id/feedback`. The API requires the merchant's authenticated Clerk identity, verifies ownership of the business, and inserts one row into `agent_events` with:
- `event_type = 'onboarding_feedback'`
- `tool_name = 'feedback_form'`
- `business_id` set to the merchant's business
- `metadata` containing the six submitted answers (`howCustomersFindYou`, `wouldPay`, `wouldPayPriority`, `monthlyAdSpend`, `wouldRefer`, and `oneThing`)
- `created_at` as the submission timestamp

This is PostgreSQL JSONB data, not browser-only state or a separate survey provider. The internal admin API exposes a read-only `GET /api/admin/feedback` endpoint to users with `telemetry.read`, joining the feedback event to its business name. The admin console includes a Feedback section. The endpoint returns only the onboarding feedback event type/tool and caps each response at 100 records.

## Validation in CI

The CI test job now starts an ephemeral PostgreSQL 16 service, sets a test-only `DATABASE_URL`, applies the Drizzle schema with `pnpm --filter @workspace/db push`, and runs the database package tests against the created tables. Integration tests write/read/update/delete test MCP request/tool events, verify the unique admin issuer+subject constraint, and verify that onboarding feedback answers persist in `agent_events.metadata`. This database is ephemeral CI infrastructure; it does not connect to staging or production.

Formatting checks compare TypeScript files changed against the PR base branch rather than failing on unrelated pre-existing formatting in untouched legacy files.
