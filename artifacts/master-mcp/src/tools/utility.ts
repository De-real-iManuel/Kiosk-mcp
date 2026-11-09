import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  db,
  businessesTable,
  businessServicesTable,
  businessProductsTable,
  businessCapabilitiesTable,
  isBusinessOpen,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// ── Shared helper: find a published, active business by slug ─────────────────

async function findPublishedBusiness(slug: string) {
  const [business] = await db
    .select({
      id: businessesTable.id,
      slug: businessesTable.slug,
      businessName: businessesTable.businessName,
      phone: businessesTable.phone,
      whatsapp: businessesTable.whatsapp,
      website: businessesTable.website,
      openingHours: businessesTable.openingHours,
      timezone: businessesTable.timezone,
    })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.slug, slug),
        eq(businessesTable.status, "published"),
        eq(businessesTable.isActive, true),
      ),
    )
    .limit(1);

  return business ?? null;
}

// ── Tool registration ─────────────────────────────────────────────────────────

export function registerUtilityTools(server: McpServer): void {
  // ── Tool 1: get_business_services ────────────────────────────────────────────

  server.tool(
    "get_business_services",
    `Lists services offered by a specific business. Only returns services marked as available.
Use for service-based businesses before suggesting a booking or inquiry.
Returns an empty array if the business has no available services.
Returns null if the business is not found or is not published.`,
    {
      slug: z.string().min(1).max(120).describe("The unique slug of the business"),
    },
    async ({ slug }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Business not found" }),
            },
          ],
        };
      }

      const services = await db
        .select({
          id: businessServicesTable.id,
          name: businessServicesTable.name,
          description: businessServicesTable.description,
          price: businessServicesTable.price,
          available: businessServicesTable.available,
        })
        .from(businessServicesTable)
        .where(
          and(
            eq(businessServicesTable.businessId, business.id),
            eq(businessServicesTable.available, true),
          ),
        );

      return { content: [{ type: "text", text: JSON.stringify(services) }] };
    },
  );

  // ── Tool 2: get_business_products ────────────────────────────────────────────

  server.tool(
    "get_business_products",
    `Lists products offered by a specific business. Only returns products marked as available.
Use for product-based businesses to show what is on offer.
Supports optional filtering by product sub-category.
Returns an empty array if the business has no available products.
Returns null if the business is not found or is not published.`,
    {
      slug: z.string().min(1).max(120).describe("The unique slug of the business"),
      category: z
        .string()
        .trim()
        .max(100)
        .optional()
        .describe("Filter by product sub-category"),
    },
    async ({ slug, category }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Business not found" }),
            },
          ],
        };
      }

      const baseConditions = [
        eq(businessProductsTable.businessId, business.id),
        eq(businessProductsTable.available, true),
      ];

      let rows = await db
        .select({
          id: businessProductsTable.id,
          name: businessProductsTable.name,
          description: businessProductsTable.description,
          category: businessProductsTable.category,
          price: businessProductsTable.price,
          available: businessProductsTable.available,
          metadata: businessProductsTable.metadata,
        })
        .from(businessProductsTable)
        .where(and(...baseConditions));

      if (category) {
        rows = rows.filter(
          (p) => p.category?.toLowerCase() === category.toLowerCase(),
        );
      }

      return { content: [{ type: "text", text: JSON.stringify(rows) }] };
    },
  );

  // ── Tool 3: check_business_status ────────────────────────────────────────────

  server.tool(
    "check_business_status",
    `Checks whether a business is currently open based on configured hours and timezone.
Note: reflects stated hours only — does not account for unexpected closures, holidays, or
special events. Always inform the user if you are relying on stated hours.
Returns is_open, current_day_hours, and next_open_at (ISO-8601) when closed.`,
    {
      slug: z.string().min(1).max(120).describe("The unique slug of the business"),
      iso_time: z
        .string()
        .max(40)
        .describe(
          'Current UTC time in ISO-8601 format (e.g. "2024-06-01T14:30:00Z")',
        ),
    },
    async ({ slug, iso_time }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Business not found" }),
            },
          ],
        };
      }

      const referenceTime = new Date(iso_time);
      if (Number.isNaN(referenceTime.getTime())) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Invalid ISO-8601 time" }) }],
          isError: true,
        };
      }
      const result = isBusinessOpen(
        business.openingHours,
        business.timezone,
        referenceTime,
      );

      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // ── Tool 4: get_business_contact ─────────────────────────────────────────────

  server.tool(
    "get_business_contact",
    `Returns safe public contact information for a business: phone, WhatsApp, and website.
Does NOT expose owner email or Clerk user ID.
Use when fallback to human contact is needed (e.g. complex enquiry, complaint, booking via phone).
Returns null values for fields that have not been configured by the business.`,
    {
      slug: z.string().min(1).max(120).describe("The unique slug of the business"),
    },
    async ({ slug }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Business not found" }),
            },
          ],
        };
      }

      const contact = {
        phone: business.phone ?? null,
        whatsapp: business.whatsapp ?? null,
        whatsapp_url: business.whatsapp
          ? `https://wa.me/${business.whatsapp}`
          : null,
        website: business.website ?? null,
      };

      return { content: [{ type: "text", text: JSON.stringify(contact) }] };
    },
  );

  // ── Tool 5: get_business_delivery ────────────────────────────────────────────

  server.tool(
    "get_business_delivery",
    `Returns delivery configuration if delivery capability is enabled for a business.
Returns { enabled: false, configuration: null } if delivery is not configured.
Use before directing a user to checkout to confirm whether delivery is actually available.`,
    {
      slug: z.string().min(1).max(120).describe("The unique slug of the business"),
    },
    async ({ slug }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Business not found" }),
            },
          ],
        };
      }

      const [deliveryRow] = await db
        .select({
          enabled: businessCapabilitiesTable.enabled,
          configuration: businessCapabilitiesTable.configuration,
        })
        .from(businessCapabilitiesTable)
        .where(
          and(
            eq(businessCapabilitiesTable.businessId, business.id),
            eq(businessCapabilitiesTable.capability, "delivery"),
            eq(businessCapabilitiesTable.enabled, true),
          ),
        )
        .limit(1);

      const result = deliveryRow
        ? { enabled: true, configuration: deliveryRow.configuration ?? null }
        : { enabled: false, configuration: null };

      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
