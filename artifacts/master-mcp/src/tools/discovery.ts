import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  db,
  categoriesTable,
  businessesTable,
  businessCapabilitiesTable,
  isBusinessOpen,
} from "@workspace/db";
import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { isBedrockEnabled, scoreAndRank } from "../lib/bedrock.js";

export function registerDiscoveryTools(server: McpServer): void {
  // ── Tool 1: discover_categories ──────────────────────────────────────────────

  server.tool(
    "discover_categories",
    `Lists all business categories available in the Kiosk ecosystem.
Use this as your first call when you need to understand what types of businesses
exist, or when the user mentions an industry or business type and you want to
find the right category before searching for specific businesses.
Returns an array of category objects with id, name, slug, and description.
Does NOT guarantee any businesses exist within a category — use search_businesses to verify.`,
    {}, // no input schema needed
    async () => {
      const categories = await db
        .select({
          id: categoriesTable.id,
          name: categoriesTable.name,
          slug: categoriesTable.slug,
          description: categoriesTable.description,
        })
        .from(categoriesTable)
        .orderBy(asc(categoriesTable.name));

      return { content: [{ type: "text", text: JSON.stringify(categories) }] };
    },
  );

  // ── Tool 2: search_businesses ────────────────────────────────────────────────

  server.tool(
    "search_businesses",
    `Searches for businesses in the Kiosk ecosystem that match the user's request.

IMPORTANT: You MUST always pass the country parameter. Never omit it.
Use the user's stated or implied location — if they say "in Lagos" that's Nigeria (NG),
if they say "in London" that's GB, etc. If the user's country is genuinely unknown,
ask for it before calling this tool. Country determines which businesses the user can
realistically visit or transact with.

Supports the following filters (country is required, all others optional, combinable):
- query: free-text match against business name and description. When Amazon Bedrock
  is enabled, results are ranked by semantic similarity so "something for my hair"
  finds hair salons even without exact keyword matches.
- country: ISO 3166-1 alpha-2 country code (REQUIRED — e.g. "NG" for Nigeria, "GB" for UK)
- city: filter by city name within the country
- category_slug: narrow to a specific business category (use discover_categories first)
- open_now + local_time: only return businesses that are currently open; provide the
  caller's local time as an ISO-8601 string (e.g. "2024-06-01T14:30:00")

Each result includes the business MCP endpoint (mcpEndpoint) which you can use to
invoke business-specific actions such as placing orders, making bookings, or browsing menus.

Does NOT return draft, inactive, or unpublished businesses.
Does NOT execute any business action — use the mcpEndpoint for that.`,
    {
      query: z
        .string()
        .optional()
        .describe("Free-text search (business name, service, product)"),
      city: z.string().optional().describe("City name to filter by"),
      country: z
        .string()
        .min(2)
        .max(2)
        .describe(
          "ISO 3166-1 alpha-2 country code — REQUIRED. Always pass this. e.g. 'NG' for Nigeria, 'GB' for UK, 'US' for United States.",
        ),
      category_slug: z
        .string()
        .optional()
        .describe("Category slug from discover_categories"),
      open_now: z
        .boolean()
        .optional()
        .describe("If true, only return businesses currently open"),
      local_time: z
        .string()
        .optional()
        .describe(
          "Caller local time in ISO-8601 (required when open_now=true)",
        ),
      limit: z.number().min(1).max(50).default(20).optional(),
    },
    async ({
      query,
      city,
      country,
      category_slug,
      open_now,
      local_time,
      limit = 20,
    }) => {
      // ── Build WHERE conditions ───────────────────────────────────────────────
      const conditions = [
        eq(businessesTable.status, "published"),
        eq(businessesTable.isActive, true),
      ];

      if (query) {
        // When Bedrock semantic ranking is enabled, skip the SQL keyword filter —
        // the ilike pattern would pre-filter results that Bedrock would rank highly
        // via semantic similarity ("somewhere to get my hair done" → hair salons).
        // Bedrock scores the full candidate set; SQL order is the fallback only.
        if (!isBedrockEnabled()) {
          const pattern = `%${query}%`;
          conditions.push(
            or(
              ilike(businessesTable.businessName, pattern),
              ilike(businessesTable.description, pattern),
            )!,
          );
        }
      }

      if (city) {
        conditions.push(ilike(businessesTable.city, `%${city}%`));
      }

      if (country) {
        conditions.push(eq(businessesTable.country, country));
      }

      // ── Resolve category slug → id ───────────────────────────────────────────
      if (category_slug) {
        const [category] = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, category_slug))
          .limit(1);

        if (category) {
          conditions.push(eq(businessesTable.categoryId, category.id));
        } else {
          // Unknown slug → return empty results immediately
          return { content: [{ type: "text", text: JSON.stringify([]) }] };
        }
      }

      // ── Fetch businesses ─────────────────────────────────────────────────────
      const effectiveLimit = Math.min(limit ?? 20, 50);

      let rows;
      try {
        rows = await db
          .select({
            id: businessesTable.id,
            slug: businessesTable.slug,
            name: businessesTable.businessName,
            description: businessesTable.description,
            city: businessesTable.city,
            country: businessesTable.country,
            location: businessesTable.location,
            phone: businessesTable.phone,
            whatsapp: businessesTable.whatsapp,
            openingHours: businessesTable.openingHours,
            timezone: businessesTable.timezone,
          })
          .from(businessesTable)
          .where(and(...conditions))
          .limit(effectiveLimit);
      } catch (error) {
        const err = error as {
          message?: string;
          code?: string;
          cause?: { message?: string; code?: string };
        };
        console.error("[search_businesses] Database query failed", {
          code: err.cause?.code ?? err.code ?? "UNKNOWN",
          message:
            err.cause?.message ?? err.message ?? "Unknown database error",
        });
        throw error;
      }

      // ── Apply open_now filter in-memory ──────────────────────────────────────
      let filtered = rows;
      if (open_now && local_time) {
        const referenceTime = new Date(local_time);
        filtered = rows.filter((b) => {
          const result = isBusinessOpen(
            b.openingHours,
            b.timezone,
            referenceTime,
          );
          return result.is_open;
        });
      }

      if (filtered.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify([]) }] };
      }

      // ── Semantic ranking via Amazon Bedrock Titan Embeddings V2 ─────────────
      // When BEDROCK_ENABLED=true, re-ranks results by semantic similarity to
      // the query. Falls back to SQL order silently if Bedrock is unavailable.
      if (query) {
        filtered = await scoreAndRank(query, filtered);
      }

      // ── Fetch enabled capabilities for matched businesses ────────────────────
      const businessIds = filtered.map((b) => b.id);
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
        const existing = capsByBusiness.get(row.businessId) ?? [];
        existing.push(row.capability);
        capsByBusiness.set(row.businessId, existing);
      }

      // ── Shape final results ──────────────────────────────────────────────────
      const results = filtered.map(
        ({
          id,
          slug,
          name,
          description,
          city,
          country,
          location,
          phone,
          whatsapp,
          openingHours,
          timezone,
        }) => ({
          slug,
          name,
          description,
          city,
          country,
          location,
          phone,
          whatsapp,
          mcpEndpoint: `${(process.env.MCP_BASE_URL ?? "http://localhost:5001").replace(/\/$/, "")}/mcp/business/${slug}`,
          capabilities: capsByBusiness.get(id) ?? [],
          openingHours,
          timezone,
        }),
      );

      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    },
  );
}
