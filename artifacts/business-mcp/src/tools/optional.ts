import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  db,
  businessProductsTable,
  businessCapabilitiesTable,
  agentEventsTable,
  bookingRequestsTable,
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
      `Submits a booking inquiry for this business.

IMPORTANT: This records a booking REQUEST — not a confirmed reservation.
Kiosk does not provide real-time availability checking or calendar integration.
The business will review and confirm (or decline) the request out-of-band,
typically via WhatsApp or phone. Always communicate this to the customer.

Returns a booking_ref, current status ("pending"), and the business contact
details so the customer can follow up if needed.`,
      {
        service_name: z.string().min(1).describe("Name of the service to book"),
        preferred_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
          .describe("Requested date in YYYY-MM-DD format"),
        preferred_time: z
          .string()
          .regex(/^\d{2}:\d{2}$/, "Must be HH:MM")
          .describe("Requested time in HH:MM (24-hour) format"),
        contact_name: z.string().min(1).describe("Customer's name"),
        contact_phone: z.string().min(1).describe("Customer's phone number"),
        notes: z
          .string()
          .optional()
          .describe("Any additional notes or special requests"),
      },
      async (input) => {
        const booking_ref = "BKG-" + Date.now();
        const whatsapp_url = business.whatsapp
          ? "https://wa.me/" + business.whatsapp.replace(/\D/g, "")
          : null;

        // Persist to the dedicated booking_requests table (not fire-and-forget)
        await db.insert(bookingRequestsTable).values({
          businessId: bid,
          bookingRef: booking_ref,
          serviceName: input.service_name,
          preferredDate: input.preferred_date,
          preferredTime: input.preferred_time,
          contactName: input.contact_name,
          contactPhone: input.contact_phone,
          notes: input.notes ?? null,
          status: "pending",
        });

        // Also log to agent_events for analytics
        db.insert(agentEventsTable)
          .values({
            businessId: bid,
            eventType: "booking_request",
            toolName: "request_booking",
            metadata: { booking_ref },
          })
          .catch(() => {});

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                booking_ref,
                status: "pending",
                message:
                  "Booking request submitted. This is NOT a confirmed reservation — the business will review and confirm availability.",
                next_steps:
                  "Contact the business directly to confirm your booking.",
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
