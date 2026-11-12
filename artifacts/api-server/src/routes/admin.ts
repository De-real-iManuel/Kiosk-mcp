import { Router, type IRouter } from "express";
import { adminLimiter } from "../middlewares/rateLimiter";
import { desc, eq, gte, ilike, and, sql } from "drizzle-orm";
import {
  db,
  adminAuditLogsTable,
  agentEventsTable,
  businessesTable,
  categoriesTable,
  incidentsTable,
  mcpRequestEventsTable,
  mcpToolEventsTable,
  supportNotesTable,
  supportTicketsTable,
} from "@workspace/db";
import {
  getAdminActor,
  requireAdmin,
  requireAdminPermission,
} from "../middlewares/require-admin";

const router: IRouter = Router();
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  next();
});
router.use(adminLimiter, requireAdmin);

router.get("/me", (_req, res) => {
  const admin = getAdminActor(res);
  res.json({
    id: admin.id,
    email: admin.email,
    displayName: admin.displayName,
    role: admin.role,
    permissions: res.locals.adminPermissions ?? [],
  });
});

router.get(
  "/overview",
  requireAdminPermission("telemetry.read"),
  async (_req, res): Promise<void> => {
    const now = new Date(),
      dayAgo = new Date(now.getTime() - 86400000),
      weekAgo = new Date(now.getTime() - 7 * 86400000);
    const [
      requests24h,
      requests7d,
      toolCalls24h,
      toolCalls7d,
      failedTools24h,
      activeBusinesses,
      sessionStarts7d,
      requestsByEndpoint,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(mcpRequestEventsTable)
        .where(gte(mcpRequestEventsTable.createdAt, dayAgo)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(mcpRequestEventsTable)
        .where(gte(mcpRequestEventsTable.createdAt, weekAgo)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(mcpToolEventsTable)
        .where(gte(mcpToolEventsTable.createdAt, dayAgo)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(mcpToolEventsTable)
        .where(gte(mcpToolEventsTable.createdAt, weekAgo)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(mcpToolEventsTable)
        .where(
          and(
            gte(mcpToolEventsTable.createdAt, dayAgo),
            eq(mcpToolEventsTable.succeeded, false),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(businessesTable)
        .where(
          and(
            eq(businessesTable.status, "published"),
            eq(businessesTable.isActive, true),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(agentEventsTable)
        .where(
          and(
            gte(agentEventsTable.createdAt, weekAgo),
            eq(agentEventsTable.eventType, "session_start"),
          ),
        ),
      db
        .select({
          endpoint: mcpRequestEventsTable.endpoint,
          requests: sql<number>`count(*)::int`,
        })
        .from(mcpRequestEventsTable)
        .where(gte(mcpRequestEventsTable.createdAt, weekAgo))
        .groupBy(mcpRequestEventsTable.endpoint)
        .orderBy(desc(sql`count(*)`)),
    ]);
    const [rateLimited24h] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mcpRequestEventsTable)
      .where(and(gte(mcpRequestEventsTable.createdAt, dayAgo), eq(mcpRequestEventsTable.httpStatus, 429)));
    const [topClients, topTools, recentErrors] = await Promise.all([
      db
        .select({
          clientName: mcpRequestEventsTable.clientName,
          clientVersion: mcpRequestEventsTable.clientVersion,
          requests: sql<number>`count(*)::int`,
          lastSeen: sql<Date>`max(${mcpRequestEventsTable.createdAt})`,
          identityStatus: mcpRequestEventsTable.clientIdentityStatus,
        })
        .from(mcpRequestEventsTable)
        .where(gte(mcpRequestEventsTable.createdAt, weekAgo))
        .groupBy(
          mcpRequestEventsTable.clientName,
          mcpRequestEventsTable.clientVersion,
          mcpRequestEventsTable.clientIdentityStatus,
        )
        .orderBy(desc(sql`count(*)`))
        .limit(6),
      db
        .select({
          endpoint: mcpToolEventsTable.endpoint,
          toolName: mcpToolEventsTable.toolName,
          calls: sql<number>`count(*)::int`,
          failures: sql<number>`count(*) filter (where ${mcpToolEventsTable.succeeded} = false)::int`,
        })
        .from(mcpToolEventsTable)
        .where(gte(mcpToolEventsTable.createdAt, weekAgo))
        .groupBy(mcpToolEventsTable.endpoint, mcpToolEventsTable.toolName)
        .orderBy(desc(sql`count(*)`))
        .limit(8),
      db
        .select({
          endpoint: mcpToolEventsTable.endpoint,
          toolName: mcpToolEventsTable.toolName,
          errorCode: mcpToolEventsTable.errorCode,
          createdAt: mcpToolEventsTable.createdAt,
        })
        .from(mcpToolEventsTable)
        .where(
          and(
            gte(mcpToolEventsTable.createdAt, weekAgo),
            eq(mcpToolEventsTable.succeeded, false),
          ),
        )
        .orderBy(desc(mcpToolEventsTable.createdAt))
        .limit(8),
    ]);
    res.json({
      generatedAt: now.toISOString(),
      metrics: {
        requests24h: requests24h[0]?.count ?? 0,
        rateLimited24h: rateLimited24h[0]?.count ?? 0,
        requests7d: requests7d[0]?.count ?? 0,
        toolCalls24h: toolCalls24h[0]?.count ?? 0,
        toolCalls7d: toolCalls7d[0]?.count ?? 0,
        failedTools24h: failedTools24h[0]?.count ?? 0,
        publishedBusinesses: activeBusinesses[0]?.count ?? 0,
        sessionStarts7d: sessionStarts7d[0]?.count ?? 0,
      },
      requestsByEndpoint,
      topClients,
      topTools,
      recentErrors,
      measurementNote:
        "Requests and tool executions are not unique people, conversations, or verified AI agents. Client labels are observed or inferred unless separately verified.",
    });
  },
);

// ── Chart data endpoints ───────────────────────────────────────────────────────

router.get(
  "/charts/requests-timeseries",
  requireAdminPermission("telemetry.read"),
  async (_req, res): Promise<void> => {
    const now = new Date();
    const dayAgo  = new Date(now.getTime() - 86_400_000);
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

    // Hourly buckets for the last 24 h
    const hourly = await db
      .select({
        bucket: sql<string>`to_char(date_trunc('hour', ${mcpRequestEventsTable.createdAt}), 'HH24:MI')`,
        requests: sql<number>`count(*)::int`,
        errors: sql<number>`count(*) filter (where ${mcpRequestEventsTable.httpStatus} >= 400)::int`,
        rateLimited: sql<number>`count(*) filter (where ${mcpRequestEventsTable.httpStatus} = 429)::int`,
        rateLimited: sql<number>`count(*) filter (where ${mcpRequestEventsTable.httpStatus} = 429)::int`,
      })
      .from(mcpRequestEventsTable)
      .where(gte(mcpRequestEventsTable.createdAt, dayAgo))
      .groupBy(sql`date_trunc('hour', ${mcpRequestEventsTable.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${mcpRequestEventsTable.createdAt})`);

    // Daily buckets for the last 7 days
    const daily = await db
      .select({
        bucket: sql<string>`to_char(date_trunc('day', ${mcpRequestEventsTable.createdAt}), 'Mon DD')`,
        requests: sql<number>`count(*)::int`,
        errors: sql<number>`count(*) filter (where ${mcpRequestEventsTable.httpStatus} >= 400)::int`,
      })
      .from(mcpRequestEventsTable)
      .where(gte(mcpRequestEventsTable.createdAt, weekAgo))
      .groupBy(sql`date_trunc('day', ${mcpRequestEventsTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${mcpRequestEventsTable.createdAt})`);

    res.json({ hourly, daily });
  },
);

router.get(
  "/charts/tools-timeseries",
  requireAdminPermission("telemetry.read"),
  async (_req, res): Promise<void> => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);

    // Top 5 tools by call volume in last 7 days
    const topTools = await db
      .select({ toolName: mcpToolEventsTable.toolName })
      .from(mcpToolEventsTable)
      .where(gte(mcpToolEventsTable.createdAt, weekAgo))
      .groupBy(mcpToolEventsTable.toolName)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const toolNames = topTools.map((t) => t.toolName);

    // Daily call counts per tool
    const rows = await db
      .select({
        bucket: sql<string>`to_char(date_trunc('day', ${mcpToolEventsTable.createdAt}), 'Mon DD')`,
        toolName: mcpToolEventsTable.toolName,
        calls: sql<number>`count(*)::int`,
        failures: sql<number>`count(*) filter (where ${mcpToolEventsTable.succeeded} = false)::int`,
      })
      .from(mcpToolEventsTable)
      .where(
        and(
          gte(mcpToolEventsTable.createdAt, weekAgo),
          sql`${mcpToolEventsTable.toolName} = any(${sql.raw(`ARRAY[${toolNames.map((n) => `'${n.replace(/'/g, "''")}'`).join(",")}]`)})`,
        ),
      )
      .groupBy(
        sql`date_trunc('day', ${mcpToolEventsTable.createdAt})`,
        mcpToolEventsTable.toolName,
      )
      .orderBy(sql`date_trunc('day', ${mcpToolEventsTable.createdAt})`);

    // Pivot: [{bucket, tool1, tool2, ...}]
    const bucketMap = new Map<string, Record<string, number>>();
    for (const row of rows) {
      if (!bucketMap.has(row.bucket)) bucketMap.set(row.bucket, { bucket: row.bucket as unknown as number });
      bucketMap.get(row.bucket)![row.toolName] = row.calls;
    }
    const pivoted = Array.from(bucketMap.values());

    res.json({ toolNames, daily: pivoted });
  },
);

router.get(
  "/charts/endpoint-breakdown",
  requireAdminPermission("telemetry.read"),
  async (_req, res): Promise<void> => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const rows = await db
      .select({
        endpoint: mcpRequestEventsTable.endpoint,
        requests: sql<number>`count(*)::int`,
        errors: sql<number>`count(*) filter (where ${mcpRequestEventsTable.httpStatus} >= 400)::int`,
      })
      .from(mcpRequestEventsTable)
      .where(gte(mcpRequestEventsTable.createdAt, weekAgo))
      .groupBy(mcpRequestEventsTable.endpoint)
      .orderBy(desc(sql`count(*)`))
      .limit(10);
    res.json(rows);
  },
);

// ── Business registration intelligence ────────────────────────────────────────

router.get(
  "/registrations",
  requireAdminPermission("telemetry.read"),
  async (req, res): Promise<void> => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const rows = await db
      .select({
        id:                       businessesTable.id,
        businessName:             businessesTable.businessName,
        description:              businessesTable.description,
        categoryId:               businessesTable.categoryId,
        categoryName:             categoriesTable.name,
        ownerClerkId:             businessesTable.ownerClerkId,
        status:                   businessesTable.status,
        location:                 businessesTable.location,
        city:                     businessesTable.city,
        country:                  businessesTable.country,
        phone:                    businessesTable.phone,
        whatsapp:                 businessesTable.whatsapp,
        website:                  businessesTable.website,
        contact:                  businessesTable.contact,
        services:                 businessesTable.services,
        createdAt:                businessesTable.createdAt,
        updatedAt:                businessesTable.updatedAt,
        registrationIp:           businessesTable.registrationIp,
        registrationUserAgent:    businessesTable.registrationUserAgent,
        registrationGeoCountry:   businessesTable.registrationGeoCountry,
        registrationGeoCity:      businessesTable.registrationGeoCity,
        registrationGeoLatitude:  businessesTable.registrationGeoLatitude,
        registrationGeoLongitude: businessesTable.registrationGeoLongitude,
        registrationGeoIsp:       businessesTable.registrationGeoIsp,
      })
      .from(businessesTable)
      .leftJoin(categoriesTable, eq(businessesTable.categoryId, categoriesTable.id))
      .orderBy(desc(businessesTable.createdAt))
      .limit(limit);
    res.json(rows);
  },
);

router.get(
  "/charts/registrations-by-country",
  requireAdminPermission("telemetry.read"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        country:       businessesTable.registrationGeoCountry,
        registrations: sql<number>`count(*)::int`,
        published:     sql<number>`count(*) filter (where ${businessesTable.status} = 'published')::int`,
      })
      .from(businessesTable)
      .where(sql`${businessesTable.registrationGeoCountry} is not null`)
      .groupBy(businessesTable.registrationGeoCountry)
      .orderBy(desc(sql`count(*)`))
      .limit(20);
    res.json(rows);
  },
);

router.get(
  "/charts/registrations-timeseries",
  requireAdminPermission("telemetry.read"),
  async (_req, res): Promise<void> => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
    const rows = await db
      .select({
        bucket:        sql<string>`to_char(date_trunc('day', ${businessesTable.createdAt}), 'Mon DD')`,
        registrations: sql<number>`count(*)::int`,
        published:     sql<number>`count(*) filter (where ${businessesTable.status} = 'published')::int`,
      })
      .from(businessesTable)
      .where(gte(businessesTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', ${businessesTable.createdAt})`)
      .orderBy(sql`date_trunc('day', ${businessesTable.createdAt})`);
    res.json(rows);
  },
);

router.get(
  "/feedback",
  requireAdminPermission("telemetry.read"),
  async (req, res): Promise<void> => {
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
      .leftJoin(
        businessesTable,
        eq(agentEventsTable.businessId, businessesTable.id),
      )
      .where(
        and(
          eq(agentEventsTable.eventType, "onboarding_feedback"),
          eq(agentEventsTable.toolName, "feedback_form"),
        ),
      )
      .orderBy(desc(agentEventsTable.createdAt))
      .limit(limit);
    res.json(rows);
  },
);

router.get(
  "/telemetry/requests",
  requireAdminPermission("telemetry.read"),
  async (req, res): Promise<void> => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const rows = await db
      .select({
        requestId: mcpRequestEventsTable.requestId,
        endpoint: mcpRequestEventsTable.endpoint,
        rpcMethod: mcpRequestEventsTable.rpcMethod,
        requestedTool: mcpRequestEventsTable.requestedTool,
        clientName: mcpRequestEventsTable.clientName,
        clientVersion: mcpRequestEventsTable.clientVersion,
        identityStatus: mcpRequestEventsTable.clientIdentityStatus,
        httpStatus: mcpRequestEventsTable.httpStatus,
        outcome: mcpRequestEventsTable.outcome,
        durationMs: mcpRequestEventsTable.durationMs,
        createdAt: mcpRequestEventsTable.createdAt,
      })
      .from(mcpRequestEventsTable)
      .orderBy(desc(mcpRequestEventsTable.createdAt))
      .limit(limit);
    res.json(rows);
  },
);

router.get(
  "/telemetry/tools",
  requireAdminPermission("telemetry.read"),
  async (_req, res): Promise<void> => {
    const since = new Date(Date.now() - 30 * 86400000);
    const rows = await db
      .select({
        endpoint: mcpToolEventsTable.endpoint,
        toolName: mcpToolEventsTable.toolName,
        calls: sql<number>`count(*)::int`,
        failures: sql<number>`count(*) filter (where ${mcpToolEventsTable.succeeded} = false)::int`,
        averageDurationMs: sql<number>`round(avg(${mcpToolEventsTable.durationMs}))::int`,
        lastUsedAt: sql<Date>`max(${mcpToolEventsTable.createdAt})`,
      })
      .from(mcpToolEventsTable)
      .where(gte(mcpToolEventsTable.createdAt, since))
      .groupBy(mcpToolEventsTable.endpoint, mcpToolEventsTable.toolName)
      .orderBy(desc(sql`count(*)`))
      .limit(100);
    res.json(rows);
  },
);

router.get(
  "/businesses",
  requireAdminPermission("business.read"),
  async (req, res): Promise<void> => {
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 100)
        : "";
    const rows = await db
      .select({
        id: businessesTable.id,
        businessName: businessesTable.businessName,
        slug: businessesTable.slug,
        city: businessesTable.city,
        country: businessesTable.country,
        status: businessesTable.status,
        isActive: businessesTable.isActive,
        createdAt: businessesTable.createdAt,
        updatedAt: businessesTable.updatedAt,
      })
      .from(businessesTable)
      .where(
        search ? ilike(businessesTable.businessName, `%${search}%`) : sql`true`,
      )
      .orderBy(desc(businessesTable.updatedAt))
      .limit(100);
    res.json(rows);
  },
);

// Remove a business from public MCP discovery without deleting its profile.
router.patch(
  "/businesses/:id/unpublish",
  requireAdminPermission("business.suspend"),
  async (req, res): Promise<void> => {
    const businessId = typeof req.params.id === "string" ? req.params.id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(businessId)) {
      res.status(400).json({ error: "Invalid business ID" });
      return;
    }
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    const actor = getAdminActor(res);
    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select({
        id: businessesTable.id,
        businessName: businessesTable.businessName,
        status: businessesTable.status,
        publishedAt: businessesTable.publishedAt,
      }).from(businessesTable).where(eq(businessesTable.id, businessId)).limit(1);
      if (!current) return { kind: "not_found" as const };
      if (current.status !== "published") return { kind: "not_published" as const, status: current.status };
      const [updated] = await tx.update(businessesTable)
        .set({ status: "draft", publishedAt: null, updatedAt: new Date() })
        .where(eq(businessesTable.id, businessId))
        .returning({ id: businessesTable.id, businessName: businessesTable.businessName, status: businessesTable.status, publishedAt: businessesTable.publishedAt });
      await tx.insert(adminAuditLogsTable).values({
        adminUserId: actor.id,
        actorIdentity: `${actor.identityProvider}|${actor.identitySubject}`,
        action: "business.unpublished",
        resourceType: "business",
        resourceId: businessId,
        reason: reason || "Removed from public discovery by an administrator",
        beforeState: { status: current.status, publishedAt: current.publishedAt },
        afterState: { status: "draft", publishedAt: null },
      });
      return { kind: "ok" as const, business: updated };
    });
    if (result.kind === "not_found") { res.status(404).json({ error: "Business not found" }); return; }
    if (result.kind === "not_published") { res.status(409).json({ error: `Business is not currently published (status: ${result.status})` }); return; }
    res.json(result.business);
  },
);
router.get(
  "/tickets",
  requireAdminPermission("support.manage"),
  async (_req, res): Promise<void> => {
    res.json(
      await db
        .select()
        .from(supportTicketsTable)
        .orderBy(desc(supportTicketsTable.updatedAt))
        .limit(100),
    );
  },
);
router.get(
  "/tickets/:id/notes",
  requireAdminPermission("support.manage"),
  async (req, res): Promise<void> => {
    const ticketId =
      typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!ticketId) {
      res.status(400).json({ error: "Invalid support ticket ID" });
      return;
    }
    res.json(
      await db
        .select()
        .from(supportNotesTable)
        .where(eq(supportNotesTable.ticketId, ticketId))
        .orderBy(desc(supportNotesTable.createdAt)),
    );
  },
);
router.get(
  "/incidents",
  requireAdminPermission("incident.manage"),
  async (_req, res): Promise<void> => {
    res.json(
      await db
        .select()
        .from(incidentsTable)
        .orderBy(desc(incidentsTable.startedAt))
        .limit(100),
    );
  },
);
router.get(
  "/audit",
  requireAdminPermission("admin.manage"),
  async (_req, res): Promise<void> => {
    res.json(
      await db
        .select()
        .from(adminAuditLogsTable)
        .orderBy(desc(adminAuditLogsTable.createdAt))
        .limit(100),
    );
  },
);

export default router;
