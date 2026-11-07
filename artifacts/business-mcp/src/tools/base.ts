import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { eq, and } from "drizzle-orm";
import { db, businessServicesTable, businessProductsTable } from "@workspace/db";
import type { BusinessSession } from "../businessSession.js";
import { recordToolEvent } from "../lib/recordEvent.js";

export function registerBaseTools(
  server: McpServer,
  session: BusinessSession,
): void {
  const { business, enabledCapabilityKeys } = session;
  const bid = business.id;

  server.tool(
    "get_business_info",
    "Returns the complete public profile of this business: name, description, category, location, hours, and timezone. Call this first when connecting to a business MCP endpoint.",
    {},
    async () => {
      recordToolEvent(bid, "get_business_info");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              name: business.businessName,
              description: business.description,
              city: business.city,
              country: business.country,
              location: business.location,
              timezone: business.timezone,
              openingHours: business.openingHours,
              status: business.status,
              agentFacts: {
                offers: {
                  summary: business.services || null,
                  services: await db
                    .select({ name: businessServicesTable.name, available: businessServicesTable.available })
                    .from(businessServicesTable)
                    .where(eq(businessServicesTable.businessId, bid)),
                  products: await db
                    .select({ name: businessProductsTable.name, available: businessProductsTable.available })
                    .from(businessProductsTable)
                    .where(eq(businessProductsTable.businessId, bid)),
                },
                serves: business.audience || null,
                operatesIn: {
                  location: business.location || null,
                  city: business.city ?? null,
                  country: business.country ?? null,
                },
                // Null means exclusions have not been provided, not that there are none.
                doesNotOffer: null,
                booking:
                  business.booking === "yes"
                    ? "accepted"
                    : business.booking === "no"
                      ? "not_accepted"
                      : "unknown",
                // Kiosk does not yet have a verification workflow.
                verification: { status: "unverified", verifiedFields: [] },
              },
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "get_services",
    "Lists all available services with name, description, and pricing. Returns empty array if no services configured.",
    {},
    async () => {
      recordToolEvent(bid, "get_services");
      const rows = await db
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
            eq(businessServicesTable.businessId, bid),
            eq(businessServicesTable.available, true),
          ),
        );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(rows) }],
      };
    },
  );

  server.tool(
    "get_hours",
    "Returns the opening hours for each day of the week and the business timezone. Hours are in 24-hour HH:MM format.",
    {},
    async () => {
      recordToolEvent(bid, "get_hours");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              openingHours: business.openingHours,
              timezone: business.timezone,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "get_contact",
    "Returns safe public contact information: phone, WhatsApp link, and website. Does NOT expose the business owner email or any private data.",
    {},
    async () => {
      recordToolEvent(bid, "get_contact");
      const whatsapp = business.whatsapp;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              phone: business.phone,
              whatsapp,
              whatsapp_url: whatsapp
                ? "https://wa.me/" + whatsapp.replace(/\D/g, "")
                : null,
              website: business.website,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "get_capabilities",
    "Lists the MCP capabilities enabled for this business. Each capability maps to additional available tools.",
    {},
    async () => {
      recordToolEvent(bid, "get_capabilities");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ capabilities: enabledCapabilityKeys }),
          },
        ],
      };
    },
  );
}
