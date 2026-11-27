import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  db,
  businessesTable,
  businessCapabilitiesTable,
  businessEndpointsTable,
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
      description: businessesTable.description,
      location: businessesTable.location,
      city: businessesTable.city,
      country: businessesTable.country,
      latitude: businessesTable.latitude,
      longitude: businessesTable.longitude,
      phone: businessesTable.phone,
      whatsapp: businessesTable.whatsapp,
      website: businessesTable.website,
      openingHours: businessesTable.openingHours,
      timezone: businessesTable.timezone,
      categoryId: businessesTable.categoryId,
      publishedAt: businessesTable.publishedAt,
      createdAt: businessesTable.createdAt,
      // ownerClerkId intentionally excluded
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

// ── Shared: build the business MCP endpoint URL from env ────────────────────
function buildMcpEndpoint(slug: string): string {
  const base = (process.env.MCP_BASE_URL ?? "http://localhost:5001").replace(
    /\/$/,
    "",
  );
  return `${base}/mcp/business/${slug}`;
}

export function registerProfileTools(server: McpServer): void {
  // ── Tool 1: get_business ─────────────────────────────────────────────────────

  server.tool(
    "get_business",
    `Fetches the complete public profile of a single business by slug.
Use when you have a specific business slug and need full details: name, description,
location, hours, contact, and enabled MCP capabilities.
Does NOT return the business owner's private information.`,
    {
      slug: z
        .string()
        .min(1)
        .max(120)
        .describe("Business slug identifier (e.g. mamas-kitchen)"),
    },
    async ({ slug }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Business not found",
                code: -32001,
              }),
            },
          ],
          isError: true,
        };
      }

      const capabilityRows = await db
        .select({ capability: businessCapabilitiesTable.capability })
        .from(businessCapabilitiesTable)
        .where(
          and(
            eq(businessCapabilitiesTable.businessId, business.id),
            eq(businessCapabilitiesTable.enabled, true),
          ),
        );

      const capabilities = capabilityRows.map((r) => r.capability);

      const result = {
        slug: business.slug,
        businessName: business.businessName,
        description: business.description,
        location: business.location,
        city: business.city,
        country: business.country,
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        whatsapp: business.whatsapp,
        website: business.website,
        openingHours: business.openingHours,
        timezone: business.timezone,
        categoryId: business.categoryId,
        publishedAt: business.publishedAt,
        createdAt: business.createdAt,
        capabilities,
        mcpEndpoint: buildMcpEndpoint(business.slug),
      };

      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  // ── Tool 2: get_business_capabilities ───────────────────────────────────────

  server.tool(
    "get_business_capabilities",
    `Returns the list of MCP capabilities enabled for a specific business.
Use to understand what actions you can perform via the business's own MCP endpoint.
Capabilities map directly to available tools on the business MCP.`,
    {
      slug: z.string().min(1).max(120).describe("Business slug identifier"),
    },
    async ({ slug }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Business not found",
                code: -32001,
              }),
            },
          ],
          isError: true,
        };
      }

      const capabilityRows = await db
        .select({ capability: businessCapabilitiesTable.capability })
        .from(businessCapabilitiesTable)
        .where(
          and(
            eq(businessCapabilitiesTable.businessId, business.id),
            eq(businessCapabilitiesTable.enabled, true),
          ),
        );

      const capabilities = capabilityRows.map((r) => r.capability);

      return {
        content: [{ type: "text", text: JSON.stringify(capabilities) }],
      };
    },
  );

  // ── Tool 3: get_business_endpoint ────────────────────────────────────────────

  server.tool(
    "get_business_endpoint",
    `Returns the MCP endpoint URL and transport type for a specific business so you can
initiate a direct MCP session. Use this as the last step in the discovery flow when
you are ready to interact with a specific business.`,
    {
      slug: z.string().min(1).max(120).describe("Business slug identifier"),
    },
    async ({ slug }) => {
      const business = await findPublishedBusiness(slug);

      if (!business) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Business not found",
                code: -32001,
              }),
            },
          ],
          isError: true,
        };
      }

      // Check for a registered external endpoint
      const [externalEndpoint] = await db
        .select({
          endpointUrl: businessEndpointsTable.endpointUrl,
          transport: businessEndpointsTable.transport,
        })
        .from(businessEndpointsTable)
        .where(
          and(
            eq(businessEndpointsTable.businessId, business.id),
            eq(businessEndpointsTable.status, "active"),
          ),
        )
        .limit(1);

      const result = externalEndpoint
        ? {
            endpoint_url: externalEndpoint.endpointUrl,
            transport: externalEndpoint.transport,
          }
        : {
            endpoint_url: buildMcpEndpoint(business.slug),
            transport: "streamable-http",
          };

      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );
}
