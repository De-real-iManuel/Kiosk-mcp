# Kiosk internal admin frontend

This is an independent Next.js application. It does not import the merchant
frontend, Clerk providers, merchant auth hooks, or merchant UI providers.

## Local development

From the repository root:

```sh
pnpm install
pnpm --filter @workspace/admin-frontend dev
```

Configure these public build-time variables when testing sign-in:

- `NEXT_PUBLIC_ADMIN_OIDC_DOMAIN`: Cognito Hosted UI domain.
- `NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID`: public Cognito app-client ID (never a client secret).
- `NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI`: exact callback URL, including
  `/internal-admin/`.
- `NEXT_PUBLIC_API_URL`: API origin.

## Static hosting

`pnpm --filter @workspace/admin-frontend build` produces `out/`. This is a
static export; it does not require a Node process or ECS service.

For the existing CloudFront hostname, configure a dedicated private S3 origin
for this export and a CloudFront behavior for `/internal-admin*`. Publish the
contents of `out/` under the `internal-admin/` object prefix. Configure the
origin/behavior to serve `internal-admin/index.html` for the console entry
route, and allow the generated `/internal-admin/_next/*` assets through that
same behavior. Do not route these paths to the merchant ECS target.

Register the exact callback with Cognito, for example
`https://<existing-cloudfront-host>/internal-admin/`. Set the API's
`CORS_ALLOWED_ORIGINS` to the exact browser origin (the existing CloudFront
origin in this path-based deployment). Apply security response headers at
CloudFront, including a restrictive CSP, HSTS, nosniff, and no-referrer policy.

The admin frontend is not added to Docker Compose, the merchant Docker image,
or ECS. Deploying the static export is a separate release step. No AWS
resources are created or changed by this repository change.
