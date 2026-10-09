# AWS Infrastructure  Kiosk

## Why ECS Fargate (not Lambda)

The Kiosk MCP servers use Streamable HTTP transport which requires long-lived HTTP connections and Server-Sent Events. AWS Lambda's maximum execution time and cold-start characteristics conflict with persistent MCP sessions. ECS Fargate provides always-warm containers with no execution time limit, appropriate for SSE-based MCP communication.

## Services

| Service | vCPU | RAM | Port | Min Tasks |
|---------|------|-----|------|-----------|
| kiosk-frontend | 0.5 | 1 GB | 3000 | 1 |
| kiosk-api-server | 0.5 | 1 GB | 4000 | 1 |
| kiosk-master-mcp | 0.5 | 1 GB | 5000 | 2 |
| kiosk-business-mcp | 1.0 | 2 GB | 5001 | 2 |

The Business MCP runtime gets more resources because it handles all tenant sessions concurrently and runs more complex query logic per request.

## ALB Routing

All HTTPS traffic enters through CloudFront, then routes to the ALB using host-based and path-based rules:

| Host | Path | Target |
|------|------|--------|
| `mcp.kiosk.example` | `/mcp/business/*` | kiosk-business-mcp |
| `mcp.kiosk.example` | `/mcp`, `/mcp/sse` | kiosk-master-mcp |
| `api.kiosk.example` | `/*` | kiosk-api-server |
| `kiosk.example` | `/*` | kiosk-frontend |

The business-mcp rule (priority 10) must come before the master-mcp rule (priority 20) to ensure `/mcp/business/*` routes correctly.

## Secrets Management

All credentials are stored in AWS Secrets Manager and injected into ECS tasks by ARN. No plaintext secrets in task definitions or environment variables.

Required secrets:
- `kiosk/database-url` ? DATABASE_URL
- `kiosk/clerk-secret-key` ? CLERK_SECRET_KEY
- `kiosk/clerk-publishable-key` ? CLERK_PUBLISHABLE_KEY

## Deployment

```bash
# Build and push images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t kiosk-master-mcp ./artifacts/master-mcp
docker tag kiosk-master-mcp:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/kiosk-master-mcp:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/kiosk-master-mcp:latest

# Register task definitions
aws ecs register-task-definition --cli-input-json file://docs/aws/task-definitions/master-mcp.json
aws ecs register-task-definition --cli-input-json file://docs/aws/task-definitions/business-mcp.json

# Update services (rolling deploy with 30s connection draining)
aws ecs update-service --cluster kiosk --service kiosk-master-mcp --force-new-deployment
aws ecs update-service --cluster kiosk --service kiosk-business-mcp --force-new-deployment
```