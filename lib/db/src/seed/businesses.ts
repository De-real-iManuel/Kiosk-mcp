import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../index.js";
import {
  businessCapabilitiesTable,
  businessEndpointsTable,
  businessProductsTable,
  businessServicesTable,
  businessesTable,
  categoriesTable,
} from "../schema/index.js";
import { generateSlug } from "../lib/slug.js";
import type { OpeningHours } from "../schema/businesses.js";

// ─── Helper: look up a category ID by slug ───────────────────────────────────

async function getCategoryId(slug: string): Promise<string> {
  const [row] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug))
    .limit(1);

  if (!row) {
    throw new Error(`Category with slug "${slug}" not found. Run seedCategories() first.`);
  }

  return row.id;
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export async function seedBusinesses(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠  seedBusinesses: skipped in production (NODE_ENV=production)');
    return;
  }
  console.log("Seeding demo businesses...");

  // ── 1. Mama's Kitchen ──────────────────────────────────────────────────────

  const restaurantCategoryId = await getCategoryId("restaurant");
  const mamasId = randomUUID();
  const mamasSlug = generateSlug("Mama's Kitchen", mamasId);

  const mamasHours: OpeningHours = {
    monday:    { open: "08:00", close: "22:00", closed: false },
    tuesday:   { open: "08:00", close: "22:00", closed: false },
    wednesday: { open: "08:00", close: "22:00", closed: false },
    thursday:  { open: "08:00", close: "22:00", closed: false },
    friday:    { open: "08:00", close: "22:00", closed: false },
    saturday:  { open: "08:00", close: "22:00", closed: false },
    sunday:    { open: "12:00", close: "20:00", closed: false },
  };

  await db
    .insert(businessesTable)
    .values({
      id: mamasId,
      ownerClerkId: "seed_demo",
      slug: mamasSlug,
      businessName: "Mama's Kitchen",
      description:
        "Popular local restaurant serving authentic Nigerian meals. Known for our jollof rice and chicken.",
      categoryId: restaurantCategoryId,
      city: "Port Harcourt",
      country: "NG",
      timezone: "Africa/Lagos",
      phone: "+2348012345678",
      whatsapp: "+2348012345678",
      openingHours: mamasHours,
      status: "published",
      isActive: true,
      publishedAt: new Date(),
      // Legacy text columns – required NOT NULL
      services: "Nigerian food delivery",
      audience: "General public",
      location: "Port Harcourt, NG",
      hours: "Mon-Sat 08:00-22:00, Sun 12:00-20:00",
      contact: "+2348012345678",
    })
    .onConflictDoNothing({ target: businessesTable.slug });

  // Re-fetch in case the row already existed (idempotent runs)
  const [mamasRow] = await db
    .select({ id: businessesTable.id, slug: businessesTable.slug })
    .from(businessesTable)
    .where(eq(businessesTable.slug, mamasSlug))
    .limit(1);

  if (mamasRow) {
    const bid = mamasRow.id;

    await db
      .insert(businessCapabilitiesTable)
      .values([
        { businessId: bid, capability: "menu",     enabled: true },
        { businessId: bid, capability: "ordering", enabled: true },
        {
          businessId: bid,
          capability: "delivery",
          enabled: true,
          configuration: {
            areas: ["GRA", "D-Line", "Rumuola", "Trans-Amadi"],
            estimated_minutes: 45,
            minimum_order: "₦1500",
          },
        },
        { businessId: bid, capability: "contact",  enabled: true },
      ])
      .onConflictDoNothing();

    await db
      .insert(businessProductsTable)
      .values([
        { businessId: bid, name: "Jollof Rice",   price: "₦2500", available: true },
        { businessId: bid, name: "Fried Rice",     price: "₦2500", available: true },
        { businessId: bid, name: "Chicken",         price: "₦1500", available: true },
        { businessId: bid, name: "Pounded Yam",    price: "₦3000", available: true },
        { businessId: bid, name: "Egusi Soup",      price: "₦2000", available: true },
        { businessId: bid, name: "Banga Soup",      price: "₦2500", available: true },
      ]);

    await db
      .insert(businessEndpointsTable)
      .values({
        businessId: bid,
        endpointUrl: `https://mcp.kiosk.example/business/${mamasRow.slug}`,
        transport: "streamable-http",
        status: "active",
        capabilities: ["menu", "ordering", "delivery", "contact"],
      })
      .onConflictDoNothing();
  }

  console.log("  ✓ Mama's Kitchen");

  // ── 2. StyleHouse Salon ────────────────────────────────────────────────────

  const salonCategoryId = await getCategoryId("salon-beauty");
  const styleId = randomUUID();
  const styleSlug = generateSlug("StyleHouse Salon", styleId);

  const styleHours: OpeningHours = {
    monday:    { open: "09:00", close: "19:00", closed: true },
    tuesday:   { open: "09:00", close: "19:00", closed: false },
    wednesday: { open: "09:00", close: "19:00", closed: false },
    thursday:  { open: "09:00", close: "19:00", closed: false },
    friday:    { open: "09:00", close: "19:00", closed: false },
    saturday:  { open: "09:00", close: "19:00", closed: false },
    sunday:    { open: "09:00", close: "19:00", closed: false },
  };

  await db
    .insert(businessesTable)
    .values({
      id: styleId,
      ownerClerkId: "seed_demo",
      slug: styleSlug,
      businessName: "StyleHouse Salon",
      description:
        "Premium hair and beauty salon offering a wide range of styling, treatment, and grooming services.",
      categoryId: salonCategoryId,
      city: "Port Harcourt",
      country: "NG",
      timezone: "Africa/Lagos",
      phone: "+2348023456789",
      whatsapp: "+2348023456789",
      openingHours: styleHours,
      status: "published",
      isActive: true,
      publishedAt: new Date(),
      services: "Hair styling, beauty treatments",
      audience: "General public",
      location: "Port Harcourt, NG",
      hours: "Tue-Sun 09:00-19:00, Mon closed",
      contact: "+2348023456789",
    })
    .onConflictDoNothing({ target: businessesTable.slug });

  const [styleRow] = await db
    .select({ id: businessesTable.id, slug: businessesTable.slug })
    .from(businessesTable)
    .where(eq(businessesTable.slug, styleSlug))
    .limit(1);

  if (styleRow) {
    const bid = styleRow.id;

    await db
      .insert(businessCapabilitiesTable)
      .values([
        { businessId: bid, capability: "services", enabled: true },
        { businessId: bid, capability: "booking",  enabled: true },
        { businessId: bid, capability: "contact",  enabled: true },
      ])
      .onConflictDoNothing();

    await db
      .insert(businessServicesTable)
      .values([
        { businessId: bid, name: "Ladies Haircut",    price: "₦3000",       available: true },
        { businessId: bid, name: "Men's Haircut",      price: "₦1500",       available: true },
        { businessId: bid, name: "Hair Treatment",     price: "₦5000",       available: true },
        { businessId: bid, name: "Braiding",           price: "From ₦4000",  available: true },
        { businessId: bid, name: "Nail Care",          price: "₦2500",       available: true },
      ]);

    await db
      .insert(businessEndpointsTable)
      .values({
        businessId: bid,
        endpointUrl: `https://mcp.kiosk.example/business/${styleRow.slug}`,
        transport: "streamable-http",
        status: "active",
        capabilities: ["services", "booking", "contact"],
      })
      .onConflictDoNothing();
  }

  console.log("  ✓ StyleHouse Salon");

  // ── 3. TechFix Solutions ───────────────────────────────────────────────────

  const electronicsCategoryId = await getCategoryId("electronics-repairs");
  const techId = randomUUID();
  const techSlug = generateSlug("TechFix Solutions", techId);

  const techHours: OpeningHours = {
    monday:    { open: "09:00", close: "18:00", closed: false },
    tuesday:   { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday:  { open: "09:00", close: "18:00", closed: false },
    friday:    { open: "09:00", close: "18:00", closed: false },
    saturday:  { open: "10:00", close: "16:00", closed: false },
    sunday:    { open: "09:00", close: "18:00", closed: true },
  };

  await db
    .insert(businessesTable)
    .values({
      id: techId,
      ownerClerkId: "seed_demo",
      slug: techSlug,
      businessName: "TechFix Solutions",
      description:
        "Professional electronics and mobile phone repair centre. Fast, reliable, and affordable fixes.",
      categoryId: electronicsCategoryId,
      city: "Port Harcourt",
      country: "NG",
      timezone: "Africa/Lagos",
      phone: "+2348034567890",
      whatsapp: "+2348034567890",
      openingHours: techHours,
      status: "published",
      isActive: true,
      publishedAt: new Date(),
      services: "Phone and electronics repair",
      audience: "General public",
      location: "Port Harcourt, NG",
      hours: "Mon-Fri 09:00-18:00, Sat 10:00-16:00, Sun closed",
      contact: "+2348034567890",
    })
    .onConflictDoNothing({ target: businessesTable.slug });

  const [techRow] = await db
    .select({ id: businessesTable.id, slug: businessesTable.slug })
    .from(businessesTable)
    .where(eq(businessesTable.slug, techSlug))
    .limit(1);

  if (techRow) {
    const bid = techRow.id;

    await db
      .insert(businessCapabilitiesTable)
      .values([
        { businessId: bid, capability: "services",    enabled: true },
        { businessId: bid, capability: "contact",     enabled: true },
        { businessId: bid, capability: "information", enabled: true },
      ])
      .onConflictDoNothing();

    await db
      .insert(businessServicesTable)
      .values([
        { businessId: bid, name: "Phone Screen Repair",  price: "₦8000",        available: true },
        { businessId: bid, name: "Battery Replacement",  price: "₦3500",        available: true },
        { businessId: bid, name: "Laptop Repair",        price: "From ₦15000",  available: true },
        { businessId: bid, name: "Data Recovery",        price: "₦10000",       available: true },
      ]);

    await db
      .insert(businessEndpointsTable)
      .values({
        businessId: bid,
        endpointUrl: `https://mcp.kiosk.example/business/${techRow.slug}`,
        transport: "streamable-http",
        status: "active",
        capabilities: ["services", "contact", "information"],
      })
      .onConflictDoNothing();
  }

  console.log("  ✓ TechFix Solutions");

  console.log("✓ Demo businesses seeded (3 businesses, idempotent)");
}
