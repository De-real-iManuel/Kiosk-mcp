import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { getMcpEndpoint } from "../lib/mcp-url.js";
import { marketplaceLimiter } from "../middlewares/rateLimiter.js";
import {
  CreateMarketplaceEventBody,
  CreateMarketplaceEventParams,
  GetMarketplaceBusinessParams,
  MarketplaceBusinessProfileResponse,
  SearchMarketplaceQueryParamsV2,
  SearchMarketplaceResponseV2,
} from "@workspace/api-zod";
import {
  db,
  agentEventsTable,
  businessesTable,
  businessCapabilitiesTable,
  businessProductsTable,
  businessServicesTable,
  categoriesTable,
  marketplaceEventsTable,
} from "@workspace/db";

const router: IRouter = Router();
router.use(marketplaceLimiter);

router.get("/marketplace", async (req, res): Promise<void> => {
  const parsed = SearchMarketplaceQueryParamsV2.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const search = parsed.data.search?.trim().slice(0, 120);
  const location = parsed.data.location?.trim().slice(0, 120);
  const city = parsed.data.city?.trim().slice(0, 120);
  const category = parsed.data.category?.trim();

  // Base filters: published AND active AND not seed_demo
  const filters = [
    eq(businessesTable.status, "published"),
    eq(businessesTable.isActive, true),
    ne(businessesTable.ownerClerkId, "seed_demo"),
  ];

  // Full-text search: businessName + description + legacy services/audience columns
  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      or(
        ilike(businessesTable.businessName, pattern),
        ilike(businessesTable.description, pattern),
        ilike(businessesTable.services, pattern),
        ilike(businessesTable.audience, pattern),
      )!,
    );
  }

  if (location) {
    filters.push(ilike(businessesTable.location, `%${location}%`));
  }

  if (city) {
    filters.push(ilike(businessesTable.city, `%${city}%`));
  }

  // Category filter: look up category by slug, then filter by categoryId
  if (category) {
    const [cat] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, category))
      .limit(1);

    if (!cat) {
      // Unknown category slug — return empty list
      res.json([]);
      return;
    }
    filters.push(eq(businessesTable.categoryId, cat.id));
  }

  const businesses = await db
    .select()
    .from(businessesTable)
    .where(and(...filters))
    .orderBy(asc(businessesTable.businessName))
    .limit(50);

  if (businesses.length === 0) {
    res.json([]);
    return;
  }

  // Fetch enabled capabilities for all returned businesses in one query
  const businessIds = businesses.map((b) => b.id);
  const capabilityRows = await db
    .select({
      businessId: businessCapabilitiesTable.businessId,
      capability: businessCapabilitiesTable.capability,
    })
    .from(businessCapabilitiesTable)
    .where(
      and(
        inArray(businessCapabilitiesTable.businessId, businessIds),
        eq(businessCapabilitiesTable.enabled, true),
      ),
    );

  // Group capabilities by businessId
  const capsByBusiness = new Map<string, string[]>();
  for (const row of capabilityRows) {
    const list = capsByBusiness.get(row.businessId) ?? [];
    list.push(row.capability);
    capsByBusiness.set(row.businessId, list);
  }

  // Shape each business into the V2 response item
  const items = businesses.map((b) => ({
    id: b.id,
    slug: b.slug,
    businessName: b.businessName,
    description: b.description ?? null,
    city: b.city ?? null,
    country: b.country ?? null,
    location: b.location ?? null,
    phone: b.phone ?? null,
    whatsapp: b.whatsapp ?? null,
    website: b.website ?? null,
    openingHours: b.openingHours ?? null,
    timezone: b.timezone ?? null,
    categoryId: b.categoryId ?? null,
    isActive: b.isActive,
    status: b.status as "draft" | "published",
    mcpEndpoint: getMcpEndpoint(b.slug),
    capabilities: (capsByBusiness.get(b.id) ?? []) as Array<
      | "menu"
      | "ordering"
      | "delivery"
      | "booking"
      | "contact"
      | "products"
      | "services"
      | "information"
    >,
    publishedAt: b.publishedAt ?? null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));

  res.json(SearchMarketplaceResponseV2.parse(items));
});

router.get("/marketplace/:slug", async (req, res): Promise<void> => {
  const params = GetMarketplaceBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.slug, params.data.slug),
        eq(businessesTable.status, "published"),
        eq(businessesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!business) {
    res.status(404).json({ error: "Published Kiosk not found" });
    return;
  }

  // Fetch the business's public capabilities and catalogue from the same source record.
  const [capabilities, products, services] = await Promise.all([
    db
      .select()
      .from(businessCapabilitiesTable)
      .where(eq(businessCapabilitiesTable.businessId, business.id)),
    db
      .select()
      .from(businessProductsTable)
      .where(eq(businessProductsTable.businessId, business.id)),
    db
      .select()
      .from(businessServicesTable)
      .where(eq(businessServicesTable.businessId, business.id)),
  ]);

  const [category] = business.categoryId
    ? await db
        .select({ name: categoriesTable.name })
        .from(categoriesTable)
        .where(eq(categoriesTable.id, business.categoryId))
        .limit(1)
    : [];

  const mcpEndpoint = getMcpEndpoint(business.slug);

  const profile = {
    id: business.id,
    slug: business.slug,
    businessName: business.businessName,
    description: business.description ?? null,
    servicesSummary: business.services || null,
    audience: business.audience || null,
    booking: business.booking === "yes" || business.booking === "no" ? business.booking : null,
    agentFacts: {
      offers: {
        summary: business.services || null,
        services: services.map((item) => ({ name: item.name, available: item.available })),
        products: products.map((item) => ({ name: item.name, available: item.available })),
      },
      serves: business.audience || null,
      operatesIn: {
        location: business.location || null,
        city: business.city ?? null,
        country: business.country ?? null,
      },
      // Null means the business has not supplied exclusions; it does not mean "offers everything".
      doesNotOffer: null,
      booking:
        business.booking === "yes"
          ? "accepted"
          : business.booking === "no"
            ? "not_accepted"
            : "unknown",
      // No verification workflow exists yet. Never present owner-submitted data as verified.
      verification: { status: "unverified", verifiedFields: [] },
    },
    categoryId: business.categoryId ?? null,
    categoryName: category?.name ?? null,
    city: business.city ?? null,
    country: business.country ?? null,
    location: business.location ?? null,
    phone: business.phone ?? null,
    whatsapp: business.whatsapp ?? null,
    website: business.website ?? null,
    openingHours: business.openingHours ?? null,
    timezone: business.timezone ?? null,
    status: business.status,
    publishedAt: business.publishedAt,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
    mcpEndpoint,
    capabilities: capabilities.map((c) => ({
      capability: c.capability,
      enabled: c.enabled,
      configuration: c.configuration ?? undefined,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      category: p.category ?? null,
      price: p.price ?? null,
      available: p.available,
    })),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      price: s.price ?? null,
      available: s.available,
    })),
  };

  res.json(MarketplaceBusinessProfileResponse.parse(profile));
});

router.post("/marketplace/:slug/events", async (req, res): Promise<void> => {
  const params = CreateMarketplaceEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateMarketplaceEventBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.slug, params.data.slug),
        eq(businessesTable.status, "published"),
        eq(businessesTable.isActive, true),
      ),
    )
    .limit(1);

  if (!business) {
    res.status(404).json({ error: "Published Kiosk not found" });
    return;
  }

  await db.insert(marketplaceEventsTable).values({
    businessId: business.id,
    eventType: body.data.eventType,
  });

  // Fire-and-forget: also record to agent events for unified analytics
  try {
    await db.insert(agentEventsTable).values({
      businessId: business.id,
      eventType: "tool_call",
      toolName: "marketplace_event",
      metadata: { eventType: body.data.eventType },
    });
  } catch {
    // Non-critical — do not fail the request if agent event insert fails
  }

  res.sendStatus(204);
});

export default router;
