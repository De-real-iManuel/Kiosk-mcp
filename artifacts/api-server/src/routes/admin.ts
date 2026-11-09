import { Router, type IRouter } from "express";
import { desc, eq, gte, ilike, and, sql } from "drizzle-orm";
import { db, adminAuditLogsTable, agentEventsTable, businessesTable, incidentsTable, mcpRequestEventsTable, mcpToolEventsTable, supportNotesTable, supportTicketsTable } from "@workspace/db";
import { getAdminActor, requireAdmin, requireAdminPermission } from "../middlewares/require-admin";

const router: IRouter = Router();
router.use(requireAdmin);

router.get("/me", (_req, res) => {
  const admin = getAdminActor(res);
  res.json({ id: admin.id, email: admin.email, displayName: admin.displayName, role: admin.role, permissions: res.locals.adminPermissions ?? [] });
});

router.get("/overview", requireAdminPermission("telemetry.read"), async (_req, res): Promise<void> => {
  const now = new Date(), dayAgo = new Date(now.getTime() - 86400000), weekAgo = new Date(now.getTime() - 7 * 86400000);
  const [requests24h, requests7d, toolCalls24h, toolCalls7d, failedTools24h, activeBusinesses, sessionStarts7d, requestsByEndpoint] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(mcpRequestEventsTable).where(gte(mcpRequestEventsTable.createdAt, dayAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(mcpRequestEventsTable).where(gte(mcpRequestEventsTable.createdAt, weekAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(mcpToolEventsTable).where(gte(mcpToolEventsTable.createdAt, dayAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(mcpToolEventsTable).where(gte(mcpToolEventsTable.createdAt, weekAgo)),
    db.select({ count: sql<number>`count(*)::int` }).from(mcpToolEventsTable).where(and(gte(mcpToolEventsTable.createdAt, dayAgo), eq(mcpToolEventsTable.succeeded, false))),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(and(eq(businessesTable.status, "published"), eq(businessesTable.isActive, true))),
    db.select({ count: sql<number>`count(*)::int` }).from(agentEventsTable).where(and(gte(agentEventsTable.createdAt, weekAgo), eq(agentEventsTable.eventType, "session_start"))),
    db.select({ endpoint: mcpRequestEventsTable.endpoint, requests: sql<number>`count(*)::int` }).from(mcpRequestEventsTable).where(gte(mcpRequestEventsTable.createdAt, weekAgo)).groupBy(mcpRequestEventsTable.endpoint).orderBy(desc(sql`count(*)`)),
  ]);
  const [topClients, topTools, recentErrors] = await Promise.all([
    db.select({ clientName: mcpRequestEventsTable.clientName, clientVersion: mcpRequestEventsTable.clientVersion, requests: sql<number>`count(*)::int`, lastSeen: sql<Date>`max(${mcpRequestEventsTable.createdAt})`, identityStatus: mcpRequestEventsTable.clientIdentityStatus }).from(mcpRequestEventsTable).where(gte(mcpRequestEventsTable.createdAt, weekAgo)).groupBy(mcpRequestEventsTable.clientName, mcpRequestEventsTable.clientVersion, mcpRequestEventsTable.clientIdentityStatus).orderBy(desc(sql`count(*)`)).limit(6),
    db.select({ endpoint: mcpToolEventsTable.endpoint, toolName: mcpToolEventsTable.toolName, calls: sql<number>`count(*)::int`, failures: sql<number>`count(*) filter (where ${mcpToolEventsTable.succeeded} = false)::int` }).from(mcpToolEventsTable).where(gte(mcpToolEventsTable.createdAt, weekAgo)).groupBy(mcpToolEventsTable.endpoint, mcpToolEventsTable.toolName).orderBy(desc(sql`count(*)`)).limit(8),
    db.select({ endpoint: mcpToolEventsTable.endpoint, toolName: mcpToolEventsTable.toolName, errorCode: mcpToolEventsTable.errorCode, createdAt: mcpToolEventsTable.createdAt }).from(mcpToolEventsTable).where(and(gte(mcpToolEventsTable.createdAt, weekAgo), eq(mcpToolEventsTable.succeeded, false))).orderBy(desc(mcpToolEventsTable.createdAt)).limit(8),
  ]);
  res.json({
    generatedAt: now.toISOString(),
    metrics: { requests24h: requests24h[0]?.count ?? 0, requests7d: requests7d[0]?.count ?? 0, toolCalls24h: toolCalls24h[0]?.count ?? 0, toolCalls7d: toolCalls7d[0]?.count ?? 0, failedTools24h: failedTools24h[0]?.count ?? 0, publishedBusinesses: activeBusinesses[0]?.count ?? 0, sessionStarts7d: sessionStarts7d[0]?.count ?? 0 },
    requestsByEndpoint, topClients, topTools, recentErrors,
    measurementNote: "Requests and tool executions are not unique people, conversations, or verified AI agents. Client labels are observed or inferred unless separately verified.",
  });
});


router.get("/feedback", requireAdminPermission("telemetry.read"), async (req, res): Promise<void> => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const rows = await db
    .select({
      id: agentEventsTable.id,
      businessId: agentEventsTable.businessId,
      businessName: businessesTable.businessName,
      eventType: agentEventsTable.eventType,
      submittedAt: agentEventsTable.createdAt,
      answers: agentEventsTable.metadata,
    })
    .from(agentEventsTable)
    .leftJoin(businessesTable, eq(agentEventsTable.businessId, businessesTable.id))
    .where(and(
      eq(agentEventsTable.eventType, "onboarding_feedback"),
      eq(agentEventsTable.toolName, "feedback_form"),
    ))
    .orderBy(desc(agentEventsTable.createdAt))
    .limit(limit);
  res.json(rows);
});

router.get("/telemetry/requests", requireAdminPermission("telemetry.read"), async (req, res): Promise<void> => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const rows = await db.select({
    requestId: mcpRequestEventsTable.requestId, endpoint: mcpRequestEventsTable.endpoint, rpcMethod: mcpRequestEventsTable.rpcMethod,
    requestedTool: mcpRequestEventsTable.requestedTool, clientName: mcpRequestEventsTable.clientName, clientVersion: mcpRequestEventsTable.clientVersion,
    identityStatus: mcpRequestEventsTable.clientIdentityStatus, httpStatus: mcpRequestEventsTable.httpStatus, outcome: mcpRequestEventsTable.outcome,
    durationMs: mcpRequestEventsTable.durationMs, createdAt: mcpRequestEventsTable.createdAt,
  }).from(mcpRequestEventsTable).orderBy(desc(mcpRequestEventsTable.createdAt)).limit(limit);
  res.json(rows);
});

router.get("/telemetry/tools", requireAdminPermission("telemetry.read"), async (_req, res): Promise<void> => {
  const since = new Date(Date.now() - 30 * 86400000);
  const rows = await db.select({
    endpoint: mcpToolEventsTable.endpoint, toolName: mcpToolEventsTable.toolName, calls: sql<number>`count(*)::int`,
    failures: sql<number>`count(*) filter (where ${mcpToolEventsTable.succeeded} = false)::int`,
    averageDurationMs: sql<number>`round(avg(${mcpToolEventsTable.durationMs}))::int`,
    lastUsedAt: sql<Date>`max(${mcpToolEventsTable.createdAt})`,
  }).from(mcpToolEventsTable).where(gte(mcpToolEventsTable.createdAt, since)).groupBy(mcpToolEventsTable.endpoint, mcpToolEventsTable.toolName).orderBy(desc(sql`count(*)`)).limit(100);
  res.json(rows);
});

router.get("/businesses", requireAdminPermission("business.read"), async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const rows = await db.select({
    id: businessesTable.id, businessName: businessesTable.businessName, slug: businessesTable.slug, city: businessesTable.city,
    country: businessesTable.country, status: businessesTable.status, isActive: businessesTable.isActive,
    createdAt: businessesTable.createdAt, updatedAt: businessesTable.updatedAt,
  }).from(businessesTable).where(search ? ilike(businessesTable.businessName, `%${search}%`) : undefined).orderBy(desc(businessesTable.updatedAt)).limit(100);
  res.json(rows);
});

router.get("/tickets", requireAdminPermission("support.manage"), async (_req, res): Promise<void> => {
  res.json(await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.updatedAt)).limit(100));
});
router.get("/tickets/:id/notes", requireAdminPermission("support.manage"), async (req, res): Promise<void> => {
  res.json(await db.select().from(supportNotesTable).where(eq(supportNotesTable.ticketId, req.params.id)).orderBy(desc(supportNotesTable.createdAt)));
});
router.get("/incidents", requireAdminPermission("incident.manage"), async (_req, res): Promise<void> => {
  res.json(await db.select().from(incidentsTable).orderBy(desc(incidentsTable.startedAt)).limit(100));
});
router.get("/audit", requireAdminPermission("admin.manage"), async (_req, res): Promise<void> => {
  res.json(await db.select().from(adminAuditLogsTable).orderBy(desc(adminAuditLogsTable.createdAt)).limit(100));
});

export default router;
