import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  db,
  businessProductsTable,
  businessCapabilitiesTable,
  agentEventsTable,
} from "@workspace/db";
import type { BusinessSession } from "../businessSession.js";

export function registerOptionalTools(
  server: McpServer,
  session: BusinessSession,
  enabledTools: string[],
): void {
  const { business } = session;
  const bid = business.id;
  const has = (name: string) => enabledTools.includes(name);

  if (has("get_products")) {
    server.tool(
      "get_products",
      "Lists products offered by this business. Only returns available products. Filter by category if needed.",
      {
        category: z
          .string()
          .optional()
          .describe("Filter by product sub-category"),
      },
      async ({ category }) => {
        const conditions = [
          eq(businessProductsTable.businessId, bid),
          eq(businessProductsTable.available, true),
        ];
        if (category)
          conditions.push(eq(businessProductsTable.category, category));
        const rows = await db
          .select({
            id: businessProductsTable.id,
            name: businessProductsTable.name,
            description: businessProductsTable.description,
            category: businessProductsTable.category,
            price: businessProductsTable.price,
            available: businessProductsTable.available,
          })
          .from(businessProductsTable)
          .where(and(...conditions));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(rows) }],
        };
      },
    );
  }

  if (has("get_delivery_information")) {
    server.tool(
      "get_delivery_information",
      "Returns delivery configuration if the business offers delivery. Includes areas, estimated time, and fees as configured by the owner.",
      {},
      async () => {
        const [row] = await db
          .select()
          .from(businessCapabilitiesTable)
          .where(
            and(
              eq(businessCapabilitiesTable.businessId, bid),
              eq(businessCapabilitiesTable.capability, "delivery"),
              eq(businessCapabilitiesTable.enabled, true),
            ),
          )
          .limit(1);
        const result = row
          ? { enabled: true, configuration: row.configuration }
          : { enabled: false, configuration: null };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      },
    );
  }

  if (has("create_order_request")) {
    server.tool(
      "create_order_request",
      "Records an order request on behalf of a customer. Does NOT process payment — provides instructions for out-of-band completion. Returns an order reference and contact details.",
      {
        items: z.array(
          z.object({
            product_name: z.string(),
            quantity: z.number().int().positive(),
            notes: z.string().optional(),
          }),
        ),
        contact_name: z.string(),
        contact_phone: z.string(),
        delivery_address: z.string().optional(),
      },
      async (input) => {
        const order_ref = "ORD-" + Date.now();
        const whatsapp_url = business.whatsapp
          ? "https://wa.me/" + business.whatsapp.replace(/\D/g, "")
          : null;
        db.insert(agentEventsTable)
          .values({
            businessId: bid,
            eventType: "order_request",
            toolName: "create_order_request",
            metadata: { order_ref, ...input },
          })
          .catch(() => {});
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                order_ref,
                message:
                  "Order request recorded. Contact the business to confirm and pay.",
                whatsapp_url,
                phone: business.phone,
                instructions:
                  "Contact the business directly to confirm your order and arrange payment.",
              }),
            },
          ],
        };
      },
    );
  }

  if (has("request_booking")) {
    server.tool(
      "request_booking",
      "Records a booking request. Does NOT guarantee availability — the business will confirm out-of-band. Returns a booking reference.",
      {
        service_name: z.string(),
        preferred_date: z.string().describe("YYYY-MM-DD"),
        preferred_time: z.string().describe("HH:MM"),
        contact_name: z.string(),
        contact_phone: z.string(),
        notes: z.string().optional(),
      },
      async (input) => {
        const booking_ref = "BKG-" + Date.now();
        const whatsapp_url = business.whatsapp
          ? "https://wa.me/" + business.whatsapp.replace(/\D/g, "")
          : null;
        db.insert(agentEventsTable)
          .values({
            businessId: bid,
            eventType: "booking_request",
            toolName: "request_booking",
            metadata: { booking_ref, ...input },
          })
          .catch(() => {});
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                booking_ref,
                message:
                  "Booking request recorded. The business will confirm availability.",
                whatsapp_url,
                phone: business.phone,
              }),
            },
          ],
        };
      },
    );
  }
}
