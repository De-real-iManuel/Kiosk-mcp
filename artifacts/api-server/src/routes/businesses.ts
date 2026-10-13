import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Response } from "express";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  CreateBusinessBodyV2,
  ListMyBusinessesResponseV2,
  GetBusinessAnalyticsParams,
  GetBusinessAnalyticsResponse,
  SetBusinessPublishedBody,
  SetBusinessPublishedParams,
  SetBusinessPublishedResponse,
  BusinessIdParams,
  UpdateBusinessBodyV2,
} from "@workspace/api-zod";
import {
  db,
  businessesTable,
  businessCapabilitiesTable,
  businessProductsTable,
  businessServicesTable,
  businessEndpointsTable,
  marketplaceEventsTable,
  agentEventsTable,
  generateSlug,
} from "@workspace/db";
import { requireAuth } from "../middlewares/require-auth";
import { assertOwnership } from "../lib/ownership";
import { getMcpEndpoint } from "../lib/mcp-url.js";
import { checkPublishReadiness } from "../lib/publishReadiness.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";

const router: IRouter = Router();
router.use(requireAuth);

// Apply write limiter to mutating routes only
router.post("/businesses", writeLimiter);
router.patch("/businesses/:id", writeLimiter);
router.patch("/businesses/:id/publish", writeLimiter);

function getOwnerId(res: Response): string {
  return res.locals.clerkUserId as string;
}

router.get("/businesses", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerClerkId, getOwnerId(res)))
    .orderBy(desc(businessesTable.createdAt));

  if (businesses.length === 0) {
    res.json([]);
    return;
  }

  const ids = businesses.map((b) => b.id);
  const enabledCapabilities = await db
    .select({
      businessId: businessCapabilitiesTable.businessId,
      capability: businessCapabilitiesTable.capability,
    })
    .from(businessCapabilitiesTable)
    .where(
      and(
        inArray(businessCapabilitiesTable.businessId, ids),
        eq(businessCapabilitiesTable.enabled, true),
      ),
    );

  const capsByBusiness = new Map<string, string[]>();
  for (const row of enabledCapabilities) {
    const list = capsByBusiness.get(row.businessId) ?? [];
    list.push(row.capability);
    capsByBusiness.set(row.businessId, list);
  }

  const results = businesses.map((b) => ({
    ...b,
    capabilities: capsByBusiness.get(b.id) ?? [],
    mcpEndpoint: getMcpEndpoint(b.slug),
  }));

  res.json(ListMyBusinessesResponseV2.parse(results));
});

router.post("/businesses", async (req, res): Promise<void> => {
  const parsed = CreateBusinessBodyV2.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Idempotency: if a draft with the same owner + name already exists, return it
  const [existingDraft] = await db
    .select({ id: businessesTable.id, slug: businessesTable.slug })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.ownerClerkId, getOwnerId(res)),
        sql`lower(${businessesTable.businessName}) = lower(${parsed.data.businessName})`,
        eq(businessesTable.status, "draft"),
      ),
    )
    .limit(1);

  if (existingDraft) {
    res.status(409).json({
      id: existingDraft.id,
      slug: existingDraft.slug,
      mcpEndpoint: getMcpEndpoint(existingDraft.slug),
    });
    return;
  }

  const id = randomUUID();
  const slug = generateSlug(parsed.data.businessName, id);

  await db.insert(businessesTable).values({
    id,
    ownerClerkId: getOwnerId(res),
    slug,
    businessName: parsed.data.businessName,
    description: parsed.data.description ?? null,
    categoryId: parsed.data.categoryId ?? null,
    location: parsed.data.location ?? "",
    city: parsed.data.city ?? null,
    country: parsed.data.country ?? null,
    phone: parsed.data.phone ?? null,
    whatsapp: parsed.data.whatsapp ?? null,
    website: parsed.data.website ?? null,
    openingHours: parsed.data.openingHours ?? null,
    timezone: parsed.data.timezone ?? "Africa/Lagos",
    isActive: true,
    status: "draft",
    // Legacy NOT NULL text columns — use empty strings until schema migration removes them
    services: "",
    audience: "",
    hours: "",
    contact: "",
  });

  const capabilities = parsed.data.capabilities ?? [];
  if (capabilities.length > 0) {
    await db.insert(businessCapabilitiesTable).values(
      capabilities.map((cap) => ({
        businessId: id,
        capability: cap.capability,
        enabled: cap.enabled,
        configuration: cap.configuration,
      })),
    );
  }

  const products = parsed.data.products ?? [];
  if (products.length > 0) {
    await db.insert(businessProductsTable).values(
      products.map((p) => ({
        businessId: id,
        name: p.name,
        description: p.description ?? null,
        category: p.category ?? null,
        price: p.price ?? null,
        available: p.available,
        metadata: p.metadata,
      })),
    );
  }

  const servicesList = parsed.data.services_list ?? [];
  if (servicesList.length > 0) {
    await db.insert(businessServicesTable).values(
      servicesList.map((s) => ({
        businessId: id,
        name: s.name,
        description: s.description ?? null,
        price: s.price ?? null,
        available: s.available,
      })),
    );
  }

  const mcpEndpoint = getMcpEndpoint(slug);
  res.status(201).json({ id, slug, mcpEndpoint });
});

router.get("/businesses/:id", async (req, res): Promise<void> => {
  const params = BusinessIdParams.parse(req.params);

  // assertOwnership throws a 404 error if not found or not owned
  const business = await assertOwnership(params.id, getOwnerId(res));

  const [enabledCapabilities, products, services] = await Promise.all([
    db
      .select({ capability: businessCapabilitiesTable.capability })
      .from(businessCapabilitiesTable)
      .where(
        and(
          eq(businessCapabilitiesTable.businessId, params.id),
          eq(businessCapabilitiesTable.enabled, true),
        ),
      ),
    db
      .select()
      .from(businessProductsTable)
      .where(eq(businessProductsTable.businessId, params.id))
      .orderBy(asc(businessProductsTable.createdAt)),
    db
      .select()
      .from(businessServicesTable)
      .where(eq(businessServicesTable.businessId, params.id))
      .orderBy(asc(businessServicesTable.createdAt)),
  ]);

  const mcpEndpoint = getMcpEndpoint(business.slug);

  res.json({
    ...business,
    capabilities: enabledCapabilities.map((c) => c.capability),
    products,
    services,
    mcpEndpoint,
  });
});

router.get("/businesses/:id/readiness", async (req, res): Promise<void> => {
  let params: { id: string };
  try {
    params = BusinessIdParams.parse(req.params);
  } catch {
    res.status(400).json({ error: "Invalid business ID" });
    return;
  }
  const business = await assertOwnership(params.id, getOwnerId(res));
  const readiness = checkPublishReadiness(business);
  res.json(readiness);
});

router.patch("/businesses/:id", async (req, res): Promise<void> => {
  let params: { id: string };
  try {
    params = BusinessIdParams.parse(req.params);
  } catch {
    res.status(400).json({ error: "Invalid business ID" });
    return;
  }

  const parsed = UpdateBusinessBodyV2.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (Object.keys(parsed.data).length === 0) {
    res
      .status(400)
      .json({ error: "Provide at least one valid business detail." });
    return;
  }

  // assertOwnership throws 404 if not found or not owned by this user
  await assertOwnership(params.id, getOwnerId(res));

  // Strip nested array fields that are not columns in businessesTable
  const {
    capabilities: _caps,
    products: _prods,
    services: _svcs,
    ...scalarFields
  } = parsed.data;

  const [business] = await db
    .update(businessesTable)
    .set({ ...scalarFields, updatedAt: new Date() })
    .where(eq(businessesTable.id, params.id))
    .returning();

  const mcpEndpoint = getMcpEndpoint(business.slug);

  res.json({ ...business, mcpEndpoint });
});

router.patch("/businesses/:id/publish", async (req, res): Promise<void> => {
  const params = SetBusinessPublishedParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SetBusinessPublishedBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Validate optional externalMcpUrl from request body
  const rawExternalUrl = (req.body as Record<string, unknown>).externalMcpUrl;
  let externalMcpUrl: string | undefined;
  if (rawExternalUrl !== undefined) {
    if (typeof rawExternalUrl !== "string") {
      res.status(400).json({ error: "External MCP URL must use HTTPS" });
      return;
    }
    try {
      const parsed = new URL(rawExternalUrl);
      if (parsed.protocol !== "https:") {
        res.status(400).json({ error: "External MCP URL must use HTTPS" });
        return;
      }
    } catch {
      res.status(400).json({ error: "External MCP URL must use HTTPS" });
      return;
    }
    externalMcpUrl = rawExternalUrl;
  }

  // assertOwnership throws 404 if not found or not owned by this user
  const current = await assertOwnership(params.data.id, getOwnerId(res));

  if (body.data.published) {
    // Gate: require minimum fields before allowing publish
    const readiness = checkPublishReadiness(current);
    if (!readiness.ready) {
      res.status(422).json({
        error: "Profile is not ready to publish",
        blocking: readiness.blocking,
        recommended: readiness.recommended,
      });
      return;
    }
    const [business] = await db
      .update(businessesTable)
      .set({
        status: "published",
        publishedAt: current.publishedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(businessesTable.id, params.data.id))
      .returning();

    const endpointUrl = externalMcpUrl ?? getMcpEndpoint(current.slug);

    await db
      .insert(businessEndpointsTable)
      .values({
        businessId: params.data.id,
        endpointUrl,
        transport: "streamable-http",
        status: "active",
      })
      .onConflictDoUpdate({
        target: businessEndpointsTable.businessId,
        set: { endpointUrl, status: "active", updatedAt: new Date() },
      });

    res.json(SetBusinessPublishedResponse.parse(business));
  } else {
    const [business] = await db
      .update(businessesTable)
      .set({
        status: "draft",
        // publishedAt intentionally preserved â€” records original first-publish timestamp
        updatedAt: new Date(),
      })
      .where(eq(businessesTable.id, params.data.id))
      .returning();

    await db
      .update(businessEndpointsTable)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(businessEndpointsTable.businessId, params.data.id));

    res.json(SetBusinessPublishedResponse.parse(business));
  }
});

router.get("/businesses/:id/analytics", async (req, res): Promise<void> => {
  const params = GetBusinessAnalyticsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.id, params.data.id),
        eq(businessesTable.ownerClerkId, getOwnerId(res)),
      ),
    )
    .limit(1);
  if (!business) {
    res.status(404).json({ error: "Owned Kiosk not found" });
    return;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const utcDay = sql<string>`to_char(${marketplaceEventsTable.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;

  const [totalViewsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(marketplaceEventsTable)
    .where(
      and(
        eq(marketplaceEventsTable.businessId, business.id),
        eq(marketplaceEventsTable.eventType, "profile_view"),
      ),
    );

  const events = await db
    .select({
      day: utcDay,
      eventType: marketplaceEventsTable.eventType,
      count: sql<number>`count(*)::int`,
    })
    .from(marketplaceEventsTable)
    .where(
      and(
        eq(marketplaceEventsTable.businessId, business.id),
        gte(marketplaceEventsTable.createdAt, since),
      ),
    )
    .groupBy(utcDay, marketplaceEventsTable.eventType)
    .orderBy(asc(utcDay));

  const dailyByDate = new Map<
    string,
    { profileViews: number; contactClicks: number; linkCopies: number }
  >();
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const date = new Date(since.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    dailyByDate.set(date, { profileViews: 0, contactClicks: 0, linkCopies: 0 });
  }

  for (const event of events) {
    const counts = dailyByDate.get(event.day);
    if (!counts) continue;
    if (event.eventType === "profile_view") counts.profileViews = event.count;
    if (event.eventType === "contact_click") counts.contactClicks = event.count;
    if (event.eventType === "copy_link") counts.linkCopies = event.count;
  }

  // MCP agent event stats
  const [mcpStats] = await db
    .select({
      sessions: sql<number>`count(*) filter (where ${agentEventsTable.eventType} = 'session_start')::int`,
      toolCalls: sql<number>`count(*) filter (where ${agentEventsTable.eventType} = 'tool_call')::int`,
    })
    .from(agentEventsTable)
    .where(
      and(
        eq(agentEventsTable.businessId, business.id),
        gte(agentEventsTable.createdAt, since),
      ),
    );

  const daily = [...dailyByDate].map(([date, values]) => ({ date, ...values }));
  const analytics = {
    totalViews: totalViewsResult?.count ?? 0,
    viewsLast30Days: daily.reduce((sum, day) => sum + day.profileViews, 0),
    contactClicksLast30Days: daily.reduce(
      (sum, day) => sum + day.contactClicks,
      0,
    ),
    linkCopiesLast30Days: daily.reduce((sum, day) => sum + day.linkCopies, 0),
    mcpSessionsLast30Days: mcpStats?.sessions ?? 0,
    mcpToolCallsLast30Days: mcpStats?.toolCalls ?? 0,
    daily,
  };

  res.json(GetBusinessAnalyticsResponse.parse(analytics));
});

export default router;
