# MCP rate limiting and rejected-request telemetry

## Current application behavior

- Master MCP has an in-memory limit of 120 requests per minute per source IP per Node.js process.
- Business MCP has an in-memory limit of 60 requests per minute per source IP per Node.js process.
- Each ECS task is a separate process with a separate counter. With multiple tasks behind the ALB, a caller can receive an aggregate allowance larger than the configured per-process value. This is not a shared/global limit.
- The business MCP already starts request telemetry before its limiter.
- The master MCP now does the same. The telemetry response-finish handler therefore persists HTTP 429 outcomes as request events.
- The admin overview and request timeseries now expose HTTP 429 counts separately from other HTTP errors.

## What this does and does not fix

The telemetry change closes the observability gap for requests that reach the MCP application and are rejected by its in-process limiter.

It does not make the in-memory counters global across ECS tasks. It also cannot record requests blocked before they reach the application (for example, by an ALB-attached AWS WAF rule). Do not treat application telemetry as a complete record of all internet traffic.

## Recommended production enforcement when Kiosk is redeployed

Use a Regional AWS WAF Web ACL associated with the Kiosk Application Load Balancer:

1. Create one rate-based rule scoped to the MCP paths (\`/mcp\` and \`/mcp/business/*\`).
2. Aggregate by the source IP observed by AWS WAF, not a caller-supplied identity header.
3. Start in **Count** mode to observe real traffic and tune the threshold using normal client behavior and the prior load test.
4. After validating the threshold, switch to **Block**. Consider separate thresholds for master discovery and business-specific MCP paths if their traffic patterns differ.
5. Keep the existing application limiter as a secondary guardrail. Document that it is per task and is not the global control.
6. Use WAF CloudWatch metrics for aggregate allowed/blocked counts. If request-level investigation is required, send WAF logs to a retained S3 bucket and apply a short retention policy. WAF-blocked requests never reach the MCP telemetry middleware.

AWS WAF rate-based rules aggregate traffic according to the rule's configured keys and evaluation window. A 1-minute window is supported, but WAF enforcement is approximate and is not a strict exact-count token bucket. Review AWS WAF's current pricing before enabling it: Web ACLs, rules, and processed requests are billed separately. Do not create or enable WAF while the Kiosk runtime is intentionally shut down.

## Alternative

A shared Redis or database-backed counter could provide application-level global limiting, but it introduces a network dependency and per-request counter operations. Do not add a new paid Redis cluster just to solve this while the service is paused. Re-evaluate only if WAF's IP-based policy is insufficient (for example, if Kiosk later needs authenticated per-merchant or per-client quotas).

## Load-test procedure after redeployment

1. Record the number of ECS tasks and task CPU/memory settings.
2. Test with one source IP and a known request rate for at least two full evaluation windows.
3. Test at the expected production concurrency, not only a single sequential loop.
4. Record 2xx/4xx/429 responses, request latency, tool executions, database load, and ECS task scaling.
5. Confirm that the admin dashboard's HTTP 429 count matches application-side 429 responses. Separately compare WAF blocked metrics/logs because those requests are not inserted into PostgreSQL telemetry.
6. Tune limits to the actual client usage profile; do not simply raise the threshold to make a synthetic test pass.
