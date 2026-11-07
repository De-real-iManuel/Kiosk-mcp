/**
 * Handwritten Zod schemas for the structured business shape (V2).
 * Do NOT edit the generated/api.ts file — put new schemas here instead.
 */
import * as z from "zod";

// ─── Opening Hours ─────────────────────────────────────────────────────────────

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const DayHoursSchema = z.object({
  open: z.string().regex(hhmmRegex, "Must be HH:MM (24-hour)"),
  close: z.string().regex(hhmmRegex, "Must be HH:MM (24-hour)"),
  closed: z.boolean(),
});

export const OpeningHoursSchema = z.object({
  monday: DayHoursSchema.nullable(),
  tuesday: DayHoursSchema.nullable(),
  wednesday: DayHoursSchema.nullable(),
  thursday: DayHoursSchema.nullable(),
  friday: DayHoursSchema.nullable(),
  saturday: DayHoursSchema.nullable(),
  sunday: DayHoursSchema.nullable(),
});

// ─── Capability ────────────────────────────────────────────────────────────────

export const CapabilityKeySchema = z.enum([
  "menu",
  "ordering",
  "delivery",
  "booking",
  "contact",
  "products",
  "services",
  "information",
]);

export type CapabilityKey = z.infer<typeof CapabilityKeySchema>;

export const CapabilityConfigSchema = z.object({
  capability: CapabilityKeySchema,
  enabled: z.boolean(),
  configuration: z.record(z.unknown()).optional(),
});

// ─── Products & Services ───────────────────────────────────────────────────────

export const ProductInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.string().optional(),
  available: z.boolean().default(true),
  imageUrl: z.string().optional(),
  quantity: z.string().optional(),
  currencyCode: z.string().max(3).optional().default("NGN"),
  metadata: z.record(z.unknown()).optional(),
});

export const ServiceInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().optional(),
  available: z.boolean().default(true),
});

// ─── Business Request Bodies ───────────────────────────────────────────────────

export const CreateBusinessBodyV2 = z.object({
  businessName: z.string().min(1).max(120),
  // Legacy free-text fields — optional AND accept empty strings (treated as not
  // provided). The form initialises these to "" which would fail .min(1) without
  // the .or(z.literal("")) branch. Empty strings are normalised to undefined
  // before DB insertion so the columns stay NULL rather than "".
  services: z.string().min(1).max(4000).optional().or(z.literal("")),
  audience: z.string().min(1).max(1000).optional().or(z.literal("")),
  hours: z.string().min(1).max(500).optional().or(z.literal("")),
  contact: z.string().min(1).max(1000).optional().or(z.literal("")),
  price: z.string().max(250).nullable().optional(),
  booking: z.enum(["yes", "no"]).nullable().optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional(),
  phone: z
    .string()
    .max(30)
    .refine(
      (v) =>
        !v ||
        (!/https?:\/\//i.test(v) && /^[+\d][\d\s().\-]{5,}$/.test(v.trim())),
      { message: "Phone must be a valid phone number, not a URL" },
    )
    .optional()
    .nullable(),
  whatsapp: z
    .string()
    .max(20)
    .refine((v) => !v || /^\d{7,15}$/.test(v.replace(/\s/g, "")), {
      message:
        "WhatsApp must be digits only in international format, e.g. 2348012345678",
    })
    .transform((v) => (v ? v.replace(/\D/g, "") : v))
    .optional()
    .nullable(),
  website: z
    .string()
    .max(500)
    .refine((v) => !v || /^https?:\/\/.+\..+/i.test(v), {
      message: "Website must be a valid http:// or https:// URL",
    })
    .optional()
    .nullable(),
  openingHours: OpeningHoursSchema.optional(),
  timezone: z.string().default("Africa/Lagos"),
  capabilities: z.array(CapabilityConfigSchema).optional(),
  products: z.array(ProductInputSchema).optional(),
  services_list: z.array(ServiceInputSchema).optional(),
});

export const UpdateBusinessBodyV2 = CreateBusinessBodyV2.partial();

// ─── Business Response Schemas ─────────────────────────────────────────────────

export const DashboardBusinessSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  businessName: z.string(),
  services: z.string().optional(),
  audience: z.string().optional(),
  hours: z.string().optional(),
  contact: z.string().optional(),
  price: z.string().nullable().optional(),
  booking: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable(),
  description: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  website: z.string().nullable(),
  openingHours: OpeningHoursSchema.nullable(),
  timezone: z.string().nullable(),
  isActive: z.boolean(),
  status: z.enum(["draft", "published"]),
  mcpEndpoint: z.string(),
  capabilities: z.array(CapabilityKeySchema),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ListMyBusinessesResponseV2 = z.array(DashboardBusinessSchema);

export const CreateBusinessResponseV2 = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  mcpEndpoint: z.string(),
});

// ─── Category ──────────────────────────────────────────────────────────────────

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
});

/** V2 version — use this instead of the generated ListCategoriesResponse */
export const ListCategoriesResponseV2 = z.array(CategorySchema);

// ─── Capability CRUD ───────────────────────────────────────────────────────────

export const UpsertCapabilityBody = z.object({
  enabled: z.boolean(),
  configuration: z.record(z.unknown()).optional(),
});

export const CapabilityParams = z.object({
  id: z.string().uuid(),
  capability: CapabilityKeySchema,
});

// ─── Marketplace Search (V2) ───────────────────────────────────────────────────

/**
 * Extended query params for GET /marketplace — overrides the generated
 * SearchMarketplaceQueryParams which only has search + location.
 */
export const SearchMarketplaceQueryParamsV2 = z.object({
  search: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
});

export type SearchMarketplaceQueryParamsV2 = z.infer<
  typeof SearchMarketplaceQueryParamsV2
>;

/** A single item returned by GET /marketplace (structured V2 shape). */
export const MarketplaceBusinessItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  businessName: z.string(),
  description: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  website: z.string().nullable(),
  openingHours: OpeningHoursSchema.nullable(),
  timezone: z.string().nullable(),
  categoryId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  status: z.enum(["draft", "published"]),
  mcpEndpoint: z.string(),
  capabilities: z.array(CapabilityKeySchema),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const SearchMarketplaceResponseV2 = z.array(
  MarketplaceBusinessItemSchema,
);

export type MarketplaceBusinessItem = z.infer<
  typeof MarketplaceBusinessItemSchema
>;

// ─── Marketplace Public Profile ───────────────────────────────────────────────

export const MarketplaceProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  price: z.string().nullable(),
  available: z.boolean(),
});

export const MarketplaceServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  available: z.boolean(),
});

/**
 * Enriched public profile returned by GET /marketplace/:slug.
 * Does NOT include ownerClerkId.
 */
export const MarketplaceBusinessProfileResponse = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  businessName: z.string(),
  description: z.string().nullable(),
  // Legacy business facts remain part of the public profile until migrated.
  servicesSummary: z.string().nullable(),
  audience: z.string().nullable(),
  booking: z.enum(["yes", "no"]).nullable(),
  agentFacts: z.object({
    offers: z.object({
      summary: z.string().nullable(),
      services: z.array(z.object({ name: z.string(), available: z.boolean() })),
      products: z.array(z.object({ name: z.string(), available: z.boolean() })),
    }),
    serves: z.string().nullable(),
    operatesIn: z.object({
      location: z.string().nullable(),
      city: z.string().nullable(),
      country: z.string().nullable(),
    }),
    doesNotOffer: z.array(z.string()).nullable(),
    booking: z.enum(["accepted", "not_accepted", "unknown"]),
    verification: z.object({
      status: z.enum(["unverified", "partially_verified", "verified"]),
      verifiedFields: z.array(z.string()),
    }),
  }),
  categoryId: z.string().uuid().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  website: z.string().nullable(),
  openingHours: OpeningHoursSchema.nullable(),
  timezone: z.string().nullable(),
  status: z.enum(["draft", "published"]),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  mcpEndpoint: z.string(),
  capabilities: z.array(CapabilityConfigSchema),
  products: z.array(MarketplaceProductSchema),
  services: z.array(MarketplaceServiceSchema),
});

export type MarketplaceBusinessProfile = z.infer<
  typeof MarketplaceBusinessProfileResponse
>;

// ─── Shared Params ─────────────────────────────────────────────────────────────

export const BusinessIdParams = z.object({
  id: z.string().uuid(),
});

export const ProductParams = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
});

export const ServiceParams = z.object({
  id: z.string().uuid(),
  serviceId: z.string().uuid(),
});

// ─── Analytics (extended with MCP stats) ──────────────────────────────────────

import { GetBusinessAnalyticsResponse } from "./generated/api.js";

/**
 * Extended analytics response that includes MCP agent event counts.
 * Use this instead of the generated GetBusinessAnalyticsResponse in routes.
 */
export const GetBusinessAnalyticsResponseV2 =
  GetBusinessAnalyticsResponse.extend({
    mcpSessionsLast30Days: z.number().int(),
    mcpToolCallsLast30Days: z.number().int(),
  });

export type GetBusinessAnalyticsResponseV2 = z.infer<
  typeof GetBusinessAnalyticsResponseV2
>;
