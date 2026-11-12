import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { categoriesTable } from "./categories.js";

// ─── Opening Hours Types ──────────────────────────────────────────────────────

export type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

export type OpeningHours = {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
};

export type CapabilityKey =
  | "menu"
  | "ordering"
  | "delivery"
  | "booking"
  | "contact"
  | "products"
  | "services"
  | "information";

// ─── Table Definition ─────────────────────────────────────────────────────────

export const businessesTable = pgTable(
  "businesses",
  {
    // ── Existing columns (do not remove) ──────────────────────────────────────
    id: uuid("id").defaultRandom().primaryKey(),
    ownerClerkId: text("owner_clerk_id").notNull(),
    slug: text("slug").notNull(),
    businessName: text("business_name").notNull(),
    services: text("services").notNull(),
    audience: text("audience").notNull(),
    location: text("location").notNull(),
    hours: text("hours").notNull(),
    contact: text("contact").notNull(),
    price: text("price"),
    booking: text("booking"),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),

    // ── New structured columns ────────────────────────────────────────────────
    description: text("description"),
    categoryId: uuid("category_id").references(() => categoriesTable.id, {
      onDelete: "set null",
    }),
    city: text("city"),
    country: text("country"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    website: text("website"),
    openingHours: jsonb("opening_hours").$type<OpeningHours>(),
    timezone: text("timezone").default("UTC"),
    isActive: boolean("is_active").notNull().default(true),

    // ── Registration intelligence ─────────────────────────────────────────────
    // Captured once at business creation for audit, fraud detection, and
    // geographic insights. IP is stored as-is (not hashed) so admins can
    // investigate abuse; access is restricted to telemetry.read permission.
    registrationIp:           text("registration_ip"),
    registrationUserAgent:    text("registration_user_agent"),
    // IP-derived geolocation (city-level, no consent required under legitimate
    // interest — disclose in privacy policy). Null when IP is private/unknown.
    registrationGeoCountry:   text("registration_geo_country"),
    registrationGeoCity:      text("registration_geo_city"),
    registrationGeoLatitude:  doublePrecision("registration_geo_latitude"),
    registrationGeoLongitude: doublePrecision("registration_geo_longitude"),
    registrationGeoIsp:       text("registration_geo_isp"),
  },
  (table) => [
    uniqueIndex("businesses_slug_unique").on(table.slug),
    index("businesses_owner_idx").on(table.ownerClerkId),
    index("businesses_status_location_idx").on(table.status, table.location),
    index("businesses_status_city_idx").on(table.status, table.city),
    index("businesses_category_idx").on(table.categoryId),
    index("businesses_reg_country_idx").on(table.registrationGeoCountry),
    index("businesses_reg_ip_idx").on(table.registrationIp),
  ],
);

export const insertBusinessSchema = createInsertSchema(businessesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businessesTable.$inferSelect;
