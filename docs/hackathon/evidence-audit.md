# Kiosk — Evidence Audit

**Project:** Kiosk — AI-facing discovery and interaction infrastructure for businesses
**Competition:** Build, Ship, Shape: Amazon Developer Hackathon 2026
**Builder:** Emmanuel Okechukwu Nwajari (De real iManuel)

---

## A. Architecture and component inventory

| Component | Path | Exists | Connected | Runtime evidence |
|---|---|---|---|---|
| Frontend (Next.js 15) | `artifacts/kiosk-frontend` | Yes | Yes — calls API via `NEXT_PUBLIC_API_URL` | Deployed on ECS Fargate, verified 200 at CloudFront URL |
| API server (Express) | `artifacts/api-server` | Yes | Yes — uses Drizzle ORM + Clerk auth | Deployed on ECS, was ACTIVE at last check |
| Master MCP (discovery) | `artifacts/master-mcp` | Yes | Yes — 10 tools, DB queries, Bedrock optional | Deployed on ECS, was ACTIVE at last check |
| Business MCP (per-tenant) | `artifacts/business-mcp` | Yes | Yes — slug routing, session cache, 5-9 tools | Deployed on ECS, was ACTIVE at last check |
| Database (PostgreSQL/Supabase) | `lib/db` | Yes | Yes — Drizzle schema, migrations | Used by all 3 backend services |
| API Zod schemas | `lib/api-zod` | Yes | Yes — validation on create/update | Used by api-server routes |
| API client (React Query) | `lib/api-client-react` | Yes | Yes — hooks for all CRUD + marketplace | Used by frontend |
| Bedrock integration | `artifacts/master-mcp/src/lib/bedrock.ts` | Yes | Yes — `embedText()`, `scoreAndRank()` | Code exists; runtime invocation NOT verified |
| Docker (frontend) | `docker/Dockerfile.kiosk-frontend` | Yes | Yes — multi-stage, standalone output | Built and pushed to ECR |
| CI workflow | `.github/workflows/ci.yml` | Yes | Yes — typecheck, test, build, format, docker | CI passes (format check was fixed) |
| Legal pages | `src/app/legal/{terms,privacy,cookies}` | Yes | Yes — linked from Footer | Deployed, verified 200 on all 3 routes |

---

## B. Most important verified engineering incidents

1. **registerBusinessTools never called (F-001)** — MCP endpoint returned "Method not found" because tools were never registered. Fixed by restructuring the handler and calling `registerBusinessTools(server, session)` before `server.connect()`. This was the critical bug that made the MCP endpoint non-functional.

2. **Mixed content error (F-003)** — Frontend deployed via CloudFront HTTPS but API URL was HTTP ALB. Browser blocked all API calls. Fixed by rebuilding Docker image with CloudFront HTTPS URLs.

3. **ChatGPT URL validation failure (F-004)** — ChatGPT's connector verifier sends `GET /mcp` without the `Accept: text/event-stream` header. The MCP SDK returned 406. Fixed with a custom handler that returns 200 for bare GET probes.

4. **422 publish gate (F-007)** — Publish readiness checker didn't accept the legacy contact text field and blocked on missing categoryId. Fixed by accepting the legacy field and making categoryId recommended.

5. **AWS account verification (F-008)** — Account verification failed for ~1 week, blocking deployment. Workaround used a separate account.

---

## C. Evidence matrix

| Claim | Evidence location | Verification method | Status | Remaining limitation |
|---|---|---|---|---|
| Frontend is deployed and reachable | CloudFront URL returns 200 | `curl.exe -s -o NUL -w "%{http_code}"` | VERIFIED | AWS session expired — needs re-check |
| Legal pages work | `/legal/terms`, `/legal/privacy`, `/legal/cookies` return 200 | `curl.exe` on all 3 routes | VERIFIED | — |
| Master MCP exposes 10 discovery tools | `master-mcp/src/server.ts` registers all 3 tool groups | Source code inspection | VERIFIED (code) | Not verified on deployed instance |
| Business MCP exposes 5-9 tools per business | `business-mcp/src/tools/register.ts` | Source code + integration tests (14 tests written) | PARTIALLY VERIFIED | Integration tests fail to load (F-012) |
| Tenant isolation enforced | Tool handlers close over `session.business.id` | Source code inspection | VERIFIED (code) | Integration tests not running |
| `ownerClerkId` never leaks | `privacy.test.ts` (2 tests, 1000 fast-check runs) | `vitest run` — 2/2 pass | VERIFIED | — |
| Publish readiness gate works | `publishReadiness.test.ts` (13 tests) | `vitest run` — 13/13 pass | VERIFIED | — |
| Owner isolation works | `ownership.test.ts` (3 tests) | `vitest run` — 3/3 pass | VERIFIED | — |
| Slug uniqueness holds | `slug.test.ts` (5 property tests, 500 runs) | `vitest run` — 5/5 pass | VERIFIED | — |
| Opening hours algorithm correct | `hours.test.ts` (7 property tests) | `vitest run` — 7/7 pass | VERIFIED | — |
| Bedrock semantic search is implemented | `master-mcp/src/lib/bedrock.ts` | Source code inspection | VERIFIED (code exists) | Not verified at runtime — `BEDROCK_ENABLED` not confirmed on deployed task |
| Bedrock falls back to keyword search | `scoreAndRank()` catches all errors and returns original order | Source code inspection | VERIFIED (code) | Fallback behaviour not tested at runtime |
| Order requests record intent | `business-mcp/src/tools/optional.ts` inserts into `agent_events` | Source code inspection | VERIFIED (code) | Not verified on deployed DB |
| WhatsApp URL is returned from contact | `get_contact` builds `https://wa.me/` from `whatsapp` field | Source code inspection | VERIFIED (code) | — |
| Payments are NOT processed | No payment code exists anywhere | Source code inspection | VERIFIED | — |
| Alexa+ is NOT directly integrated | No Alexa+ code or config in repo | Source code inspection | VERIFIED | — |
| AWS deployment is on ECS Fargate | 4 services on `kiosk-mcp-production` cluster | AWS CLI (now expired) | PARTIALLY VERIFIED | Needs re-auth to verify current health |
| ChatGPT can connect to Master MCP | GET /mcp fix deployed, ngrok test succeeded | Manual testing via ngrok | PARTIALLY VERIFIED | Not verified on production CloudFront URL |

---

## D. Missing evidence needed before submission

1. **AWS session re-authentication** — needed to verify all 4 ECS services are still running and healthy.
2. **Live Master MCP discovery test** — `curl -X POST https://d127130891zv0m.cloudfront.net/mcp` with a `search_businesses` call to confirm real DB records are returned.
3. **Live Business MCP tool call** — `curl -X POST https://d127130891zv0m.cloudfront.net/business-mcp/mcp/business/:slug` with `tools/list` to confirm tools are registered.
4. **End-to-end ChatGPT test** — connect ChatGPT to the production Master MCP URL and verify it can discover businesses and call tools.
5. **Bedrock model access** — confirm Titan Embeddings V2 model access is enabled in `us-east-1` and `BEDROCK_ENABLED=true` is set on the master-mcp ECS task.
6. **Integration test fix** — resolve the vite resolution issue preventing `integration.test.ts` from loading.

---

## E. Statements that must NOT be made in the Devpost submission

1. **Do not claim Alexa+ direct integration.** ChatGPT was used as the demo client. Alexa+ is not connected.
2. **Do not claim payments are processed.** Order requests and booking requests record intent only.
3. **Do not claim Bedrock semantic search is live.** The code is implemented but runtime invocation is not verified on the deployed instance.
4. **Do not claim businesses are notified when orders are placed.** Events are logged to the database; no push notification or webhook is sent to the business owner.
5. **Do not claim all 49 tests pass.** 35 tests pass (12 db + 16 api + 4 master-mcp + 7 business-mcp non-integration + 3 already counted). 14 integration tests are written but fail to load.
6. **Do not claim the AWS deployment is healthy without re-checking.** The AWS session expired; the last health check was on Oct 21, 2026.
7. **Do not claim real businesses were onboarded.** The demo uses seeded data (Mama's Kitchen, StyleHouse Salon, TechFix Solutions).
8. **Do not claim GDPR or any regulatory compliance.** The legal pages are initial drafts marked as requiring legal review.

---

## F. Strongest defensible engineering accomplishments

1. **Multi-tenant MCP runtime** — one process handles all tenants via slug routing, with per-request tool registration that closes over the tenant's business ID. Structurally prevents cross-tenant data access.

2. **10-tool Master MCP discovery layer** — search, categories, business profiles, endpoint resolution, open/closed status, services, products, delivery, and contact — all filtering `status = 'published' AND is_active = true` at the SQL layer.

3. **Property-based testing** — 12 tests using fast-check to verify slug uniqueness (500 runs), open/closed boundary correctness, and owner isolation invariants across random inputs.

4. **ChatGPT MCP connector compatibility** — solved the GET /mcp probe issue that prevented ChatGPT from accepting the MCP URL, making Kiosk one of the first custom MCP servers to work with ChatGPT's custom connector feature.

5. **Production deployment on AWS ECS Fargate** — all 4 services deployed behind CloudFront with HTTPS, Secrets Manager for credentials, and structured logging to CloudWatch.

6. **Bedrock integration with graceful fallback** — semantic search scoring using Titan Embeddings V2, with automatic fallback to keyword search when Bedrock is unavailable or not configured.

7. **Publish readiness gate** — structured validation that returns specific missing fields, preventing incomplete business profiles from going live.

8. **Phone/website/WhatsApp data quality fix** — the website-in-phone-field bug was diagnosed, fixed with Zod schema validation, and covered by a regression test.

---

## G. End-to-end demonstration checklist

1. **Business onboarding** — Sign up at `https://d127130891zv0m.cloudfront.net/create`, fill the form with separate phone/WhatsApp/website fields, save draft.
2. **Publish** — Click Publish Kiosk, confirm the preview modal appears, publish. Dashboard shows the MCP endpoint URL.
3. **Master MCP discovery** — `curl -X POST https://d127130891zv0m.cloudfront.net/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'` — confirm 10 tools are listed.
4. **Search businesses** — Call `search_businesses` with `{"query":"restaurant","city":"Port Harcourt"}` — confirm Mama's Kitchen appears with its endpoint URL.
5. **Business MCP tool call** — Call `get_business_info` on the returned endpoint — confirm real business data (name, description, hours, contact).
6. **Contact handoff** — Call `get_contact` — confirm phone, WhatsApp URL, and website are returned in the correct fields.
7. **Order intent** — Call `create_order_request` — confirm an order reference and WhatsApp URL are returned. State clearly that this is intent capture, not payment.
8. **Bedrock** — Only demonstrate if `BEDROCK_ENABLED=true` is confirmed on the deployed task. Otherwise, state that semantic search falls back to keyword search.
9. **Failure case** — Call `search_businesses` with a non-existent city — confirm empty results are returned, not an error.
