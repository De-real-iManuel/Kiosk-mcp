# Kiosk — AWS Infrastructure Guide

Everything needed to deploy Kiosk to AWS from scratch.

---

## Files in this directory

| File | Purpose |
|---|---|
| `task-definitions/api-server.json` | ECS Fargate task definition for the REST API |
| `task-definitions/business-mcp.json` | ECS Fargate task definition for the per-tenant MCP runtime |
| `task-definitions/master-mcp.json` | ECS Fargate task definition for the discovery MCP server |
| `task-definitions/kiosk-frontend.json` | ECS Fargate task definition for the Next.js frontend |
| `alb-listener-rules.json` | ALB HTTPS listener rules — host + path routing |
| `auto-scaling.json` | ECS Service Auto Scaling policies (CPU target tracking) |
| `iam-task-roles.json` | IAM policy statements for each service's task role |
| `secrets-manager.json` | All secrets to create in Secrets Manager before deploy |

---

## Why ECS Fargate, not Lambda

Kiosk's MCP servers use **Streamable HTTP with Server-Sent Events**. Lambda has a 15-minute execution limit and cold-start latency that breaks persistent SSE connections. Fargate containers are always warm with no execution time ceiling — exactly what a live MCP endpoint needs.

---

## Pre-deployment checklist

### 1. Create Secrets Manager secrets

```bash
aws secretsmanager create-secret \
  --name kiosk/database-url \
  --secret-string "postgresql://user:pass@host:5432/kiosk?sslmode=require"

aws secretsmanager create-secret \
  --name kiosk/clerk-secret-key \
  --secret-string "sk_live_..."

aws secretsmanager create-secret \
  --name kiosk/clerk-publishable-key \
  --secret-string "pk_live_..."

aws secretsmanager create-secret \
  --name kiosk/api-url \
  --secret-string "https://api.kiosk.example"

aws secretsmanager create-secret \
  --name kiosk/mcp-base-url \
  --secret-string "https://mcp.kiosk.example"
```

See `secrets-manager.json` for the full list with descriptions.

### 2. Create ECR repositories

```bash
for repo in kiosk-frontend kiosk-api-server kiosk-master-mcp kiosk-business-mcp; do
  aws ecr create-repository --repository-name $repo --region us-east-1
done
```

### 3. Create IAM task roles

Create these roles and attach the policies from `iam-task-roles.json`:

- `kioskFrontendTaskRole`
- `kioskApiServerTaskRole`
- `kioskMasterMcpTaskRole` — **must have `bedrock:InvokeModel` permission** for Titan Embeddings
- `kioskBusinessMcpTaskRole`

The standard `ecsTaskExecutionRole` (AWS-managed policy `AmazonECSTaskExecutionRolePolicy`) handles image pulls and CloudWatch log creation — reference it in `executionRoleArn` for all tasks.

### 4. Create the ECS cluster

```bash
aws ecs create-cluster --cluster-name kiosk
```

### 5. Create an ALB and target groups

Create one HTTPS listener on port 443. Create four target groups:

| Target group name | Protocol | Port | Health check path |
|---|---|---|---|
| `kiosk-frontend` | HTTP | 3000 | `/` |
| `kiosk-api-server` | HTTP | 4000 | `/api/health` |
| `kiosk-master-mcp` | HTTP | 5000 | `/health` |
| `kiosk-business-mcp` | HTTP | 5001 | `/health` |

Then apply the listener rules from `alb-listener-rules.json`. **Priority 10 (business-mcp) must be registered before priority 20 (master-mcp)** to prevent `/mcp/business/*` matching the master MCP rule.

---

## Deploy

### Build and push images

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1

# Authenticate
aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin \
    $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and push each service
for svc in api-server business-mcp master-mcp kiosk-frontend; do
  docker build -t kiosk-$svc ./artifacts/$svc
  docker tag kiosk-$svc:latest \
    $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/kiosk-$svc:latest
  docker push \
    $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/kiosk-$svc:latest
done
```

### Register task definitions

Replace `ACCOUNT_ID` in each task definition file first:

```bash
for svc in api-server business-mcp master-mcp kiosk-frontend; do
  sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" docs/aws/task-definitions/$svc.json
  aws ecs register-task-definition \
    --cli-input-json file://docs/aws/task-definitions/$svc.json
done
```

### Create / update ECS services (rolling deploy)

```bash
for svc in kiosk-api-server kiosk-business-mcp kiosk-master-mcp kiosk-frontend; do
  aws ecs update-service \
    --cluster kiosk \
    --service $svc \
    --force-new-deployment \
    --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200"
done
```

---

## Service sizing

| Service | vCPU | RAM | Min tasks | Max tasks | Scale trigger |
|---|---|---|---|---|---|
| kiosk-frontend | 0.5 | 1 GB | 1 | 5 | 70% CPU |
| kiosk-api-server | 0.5 | 1 GB | 1 | 10 | 60% CPU |
| kiosk-master-mcp | 0.5 | 1 GB | 2 | 10 | 60% CPU |
| kiosk-business-mcp | 1.0 | 2 GB | 2 | 20 | 60% CPU |

`business-mcp` gets 2× resources because it handles all tenant sessions in one process and runs DB queries per request. Auto-scaling config: `auto-scaling.json`.

---

## DNS and TLS

Point three subdomains at your ALB via Route 53 alias records:

| Subdomain | Target |
|---|---|
| `kiosk.example` | ALB DNS name |
| `api.kiosk.example` | ALB DNS name |
| `mcp.kiosk.example` | ALB DNS name |

Request a certificate for all three in **AWS Certificate Manager** (ACM) and attach it to the ALB HTTPS listener. CloudFront in front of the ALB gives you edge caching and AWS Shield Standard DDoS protection at no extra cost.

---

## Bedrock note (master-mcp only)

`master-mcp` uses Amazon Bedrock **Titan Embeddings v2** for semantic search scoring. The task role `kioskMasterMcpTaskRole` must have this IAM permission:

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel"],
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
}
```

Bedrock must be enabled in `us-east-1`. If you deploy to a different region, update `AWS_REGION` in the task definition and the model ARN. When `BEDROCK_ENABLED=false`, search falls back to trigram similarity with no code changes needed.
