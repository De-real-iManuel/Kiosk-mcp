# Kiosk AWS shutdown and data-preservation runbook

Purpose: pause Kiosk's AWS runtime and recurring infrastructure charges without deleting source code, merchant data, database backups, static files, or the Cognito administrator identity.

This is a manual console runbook. Do not delete a resource merely because its name contains Kiosk; first confirm its region, dependencies, and data.

## Before touching AWS

1. Sign in to the correct AWS account and select **us-east-1 (N. Virginia)**. Repeat the inventory in any other region used by Kiosk.
2. Open **Billing and Cost Management → Cost Explorer**. Set the date range to the last 30 days and group costs by **Service**. Record the current largest services.
3. Open **S3 → Buckets** and identify the bucket(s) containing Kiosk uploads, static files, exports, or backups. Do not delete these buckets.
4. Identify where PostgreSQL actually runs. If it is Neon, Supabase, or another external provider, do not change anything in AWS RDS. If it is RDS, follow the RDS section below.
5. Preserve the root local `.env` securely outside the repository. Never commit it, upload it to a public bucket, or paste its secrets into chat. Record which AWS secrets are still needed to restart Kiosk.
6. Confirm the current Git branch and push all intended source changes to GitHub.

## 1. Stop ECS Fargate tasks first

Console: **Amazon ECS → Clusters → kiosk-mcp-production → Services**.

For every Kiosk ECS service (master MCP, business MCP, API server, merchant frontend, and any other Kiosk service):

1. Open the service.
2. Choose **Update service**.
3. Set **Desired tasks** to **0**.
4. Keep the service and task definition for now; do not delete them.
5. Save and wait until the service shows zero running tasks and the tasks are stopped.
6. Repeat for every service in the cluster.

This stops Fargate task compute. The ECS cluster, task definitions, and stopped service configuration do not themselves create Fargate compute charges. The ALB, logs, storage, and other dependent resources can still cost money.

## 2. Delete the Application Load Balancer

Console: **EC2 → Load Balancers**.

1. Locate the Kiosk ALB, previously named `kiosk-api-alb-1907100829`.
2. Confirm no non-Kiosk service depends on it.
3. Record its listener rules, DNS name, security group, and target groups if you may need to recreate it.
4. Delete the ALB.
5. After deletion, review **EC2 → Target Groups** and delete Kiosk-only target groups that are no longer referenced.

Important: an ALB incurs hourly and capacity-unit charges while it exists, even when the app is idle. Deleting it makes the old ALB hostname unavailable. Recreating an ALB later will give it a new DNS name unless you restore the same custom DNS mapping.

## 3. Secrets Manager

Console: **AWS Secrets Manager → Secrets**.

For each secret:

1. Open the secret and inspect its name, description, tags, and last accessed information.
2. Confirm no remaining service, Lambda, rotation function, or external system uses it.
3. Preserve the required values in the secured local environment/password manager before deleting anything.
4. Select only secrets that are no longer required and choose **Schedule deletion** (or immediate deletion only if you are certain).
5. AWS does not charge for a secret while it is marked for deletion. A recovery window can be retained if you want a safety net.

Do not delete a secret simply because ECS is stopped. Keep a secure copy of the values needed to restart. Never place plaintext secrets in Git.

## 4. Bedrock

For on-demand Bedrock inference (for example, Titan embeddings), there is no need to delete the model or disable the service just to stop usage. No inference calls means no on-demand inference usage charges.

Check **Amazon Bedrock → Provisioned Throughput** and confirm there are no provisioned model units, active custom model deployments, batch jobs, or other paid resources. Stop/delete any paid provisioned resources only after confirming they are not needed.

## 5. ECR image storage

Console: **Amazon ECR → Private registry → Repositories**.

ECR storage is billable by the amount of private image data retained. It is not a running service, so it does not stop charging merely because ECS tasks are stopped.

Recommended low-cost preservation:

1. Keep the Kiosk repositories.
2. Keep the latest known-good image for each service you may restart.
3. Delete old, unneeded image tags/digests, or configure a lifecycle policy to expire old untagged images.
4. Do not delete the entire repository unless you have another verified copy of every image you need.

AWS's ECR pricing page gives an example of private image storage at $0.10 per GB-month; actual rates and free-tier eligibility depend on region/account. Same-region pulls from ECR to ECS are not charged for data transfer.

## 6. CloudWatch

Console: **CloudWatch → Logs → Log groups**.

There is no single CloudWatch service switch to turn off. Stop future log production by stopping the ECS tasks, then reduce retained data:

1. Identify Kiosk log groups (usually named with `/ecs/` or the service name).
2. Export logs to S3 first if you may need debugging or audit history.
3. For logs you want to keep in CloudWatch, set a short retention period such as 1 day or 7 days.
4. Delete Kiosk log groups whose contents are no longer needed after export/confirmation.
5. Review **CloudWatch → Alarms** and delete unused Kiosk alarms.
6. Review custom metrics, Container Insights, dashboards, Contributor Insights, and log-query features. Remove paid features that are not needed.

Default AWS service metrics are often provided without extra charge, but log ingestion/storage, custom metrics, alarms, Container Insights, and query features can be billable. Do not delete CloudWatch log groups until you have decided whether you need their history.

## 7. NAT Gateway and Elastic IP addresses

You said you did not configure a NAT Gateway. Verify once:

- **VPC → NAT Gateways**: if none exist for Kiosk, there is nothing to delete.
- **EC2 → Elastic IPs**: release any unused/unattached Kiosk Elastic IPs. Do not release an address attached to another live workload.
- **VPC → Endpoints**: check for unused Interface VPC Endpoints. These can have hourly and data-processing charges; delete only Kiosk-only endpoints after confirming dependencies.

VPCs, subnets, route tables, network ACLs, and security groups generally do not have hourly charges by themselves. Do not delete the VPC just to stop the app.

## 8. RDS database (only if PostgreSQL is actually on AWS RDS)

Console: **RDS → Databases**.

First confirm the database is RDS. If the DATABASE_URL points to Neon/Supabase/another provider, this section does not apply.

For RDS:

1. Create a manual snapshot: select the DB → **Actions → Take snapshot**.
2. Wait for the snapshot status to become **Available**.
3. Record the DB identifier, engine/version, instance class, storage, subnet group, security groups, parameter group, and region.
4. If you only need a short pause, choose **Actions → Stop temporarily**. RDS stops instance-hour charges, but storage, backups/snapshots, and a public IPv4 address can still cost money. RDS automatically restarts a stopped DB after 7 consecutive days.
5. If you need the database paused for longer than 7 days and want to stop DB instance-hour charges, keep the verified snapshot and delete the DB instance (not the snapshot). This is destructive to the live instance and requires a later restore; snapshot storage remains billable.
6. Do not delete the snapshot or automated backups unless you intentionally no longer need the data.

If the database is external, separately check that provider's pause/suspend and backup settings. AWS ECS shutdown does not pause an external database.

## 9. S3 and CloudFront

S3: **S3 → Buckets**.

- Keep buckets containing merchant uploads, static assets, backups, exports, and any admin static build.
- Do not empty or delete them.
- Review bucket versions, incomplete multipart uploads, and old objects if storage cost becomes material. Do not remove files needed for recovery.
- S3 storage and requests can still cost money, but keeping a small amount of important data is usually preferable to deleting it.

CloudFront: **CloudFront → Distributions**.

- If Kiosk's CloudFront distribution is no longer needed while the app is offline, disable the distribution and wait for deployment to complete. This prevents new distribution traffic; it does not delete the S3 origin or files.
- Keep the distribution enabled only if you still need the static admin/merchant pages or other hosted assets.
- Review request/data-transfer usage in Cost Explorer; CloudFront is usage-based, not an ECS-style task that you stop.

## 10. Cognito — keep it

Keep the Kiosk Admin Cognito User Pool, app client, domain, and your `emmanuel@agrigrant.xyz` administrator identity. Do not delete the pool or recreate it later just to save a small amount.

Check the user-pool pricing tier. AWS currently provides a 10,000 monthly active user free tier for Lite and Essentials user pools; Plus does not have that free tier. A single admin user on Lite/Essentials should generally remain within the free tier, assuming no paid add-ons or other billable features.

Keep self-registration disabled and preserve the exact pool ID, app client ID, issuer, and hosted-login domain in your secure records.

## 11. Final cost verification

1. Return to **Billing → Cost Explorer**.
2. Group the last 30 days by service and region.
3. Check for remaining spend under ECS/Fargate, Elastic Load Balancing, Secrets Manager, CloudWatch, ECR, RDS, NAT Gateway, EC2-Other, VPC, S3, and CloudFront.
4. Check **Billing → Bills** after the next billing refresh; Cost Explorer and billing data can lag.
5. Set an AWS Budget alert at a low monthly threshold so an overlooked resource is visible.
6. Recheck Cost Explorer after 24–48 hours and again after the next bill update.

## Resources that normally do not need deletion

- ECS cluster and task definitions after desired count is zero.
- IAM roles and policies needed for a future restart.
- VPC, subnets, security groups, route tables, and network ACLs, provided there are no paid endpoints or NAT resources.
- Cognito user pool and admin user.
- S3 buckets and important snapshots.

## Important limitations

This runbook does not inspect the live AWS account and cannot confirm which resources currently exist. Use the names above as clues, not proof. Do not delete RDS, secrets, buckets, or network resources until you have checked their dependencies and preserved the data you need.
