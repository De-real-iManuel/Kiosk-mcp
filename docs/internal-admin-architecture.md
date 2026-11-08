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
