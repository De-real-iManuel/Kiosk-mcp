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

/**
 * Build a WhatsApp click-to-chat URL with a pre-filled message.
 * The message is URL-encoded so it opens directly in WhatsApp with the
 * booking or order details ready to send — no copy-paste needed.
 */
function buildWhatsAppUrl(
  whatsapp: string | null,
  message: string,
): string | null {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

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
      "Records an order request on behalf of a customer. Does NOT process payment — provides instructions for out-of-band completion. Returns an order reference and a pre-filled WhatsApp link the customer can use to confirm directly with the business.",
      {
        items: z.array(
          z.object({
            product_name: z.string().min(1),
            quantity: z.number().int().positive(),
            notes: z.string().optional(),
          }),
        ),
        contact_name: z.string().min(1),
        contact_phone: z.string().min(1),
        delivery_address: z.string().optional(),
      },
      async (input) => {
        const order_ref = "ORD-" + Date.now();

        // Build pre-filled WhatsApp message with all order details
        const itemLines = input.items
          .map(
            (i) =>
              `• ${i.quantity}x ${i.product_name}${i.notes ? ` (${i.notes})` : ""}`,
          )
          .join("\n");
        const waMessage = [
          `📦 New Order Request — ${order_ref}`,
          ``,
          `Customer: ${input.contact_name}`,
          `Phone: ${input.contact_phone}`,
          ...(input.delivery_address
            ? [`Delivery: ${input.delivery_address}`]
            : []),
          ``,
          `Items:`,
          itemLines,
        ].join("\n");

        const whatsapp_url = buildWhatsAppUrl(business.whatsapp, waMessage);

        // Persist (not fire-and-forget)
        await db.insert(agentEventsTable).values({
          businessId: bid,
          eventType: "order_request",
          toolName: "create_order_request",
          metadata: { order_ref, ...input },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                order_ref,
                status: "pending",
                message:
                  "Order request recorded. Use the WhatsApp link to send the order details directly to the business and confirm.",
                whatsapp_url,
                phone: business.phone,
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

If get_services returned an empty list, you can still submit a booking —
use a general service description like "General appointment" or "Consultation"
as the service_name. The business will clarify the specific service when
they confirm.

Returns a booking_ref, current status ("pending"), and a pre-filled WhatsApp
link with all booking details ready to send to the business.`,
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

        // Build pre-filled WhatsApp message with all booking details
        const waMessage = [
          `📅 Booking Request — ${booking_ref}`,
          ``,
          `Service: ${input.service_name}`,
          `Date: ${input.preferred_date}`,
          `Time: ${input.preferred_time}`,
          `Customer: ${input.contact_name}`,
          `Phone: ${input.contact_phone}`,
          ...(input.notes ? [`Notes: ${input.notes}`] : []),
          ``,
          `Please confirm availability.`,
        ].join("\n");

        const whatsapp_url = buildWhatsAppUrl(business.whatsapp, waMessage);

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
                  "Booking request submitted. This is NOT a confirmed reservation — the business will review and confirm availability. Use the WhatsApp link to send the booking details directly to the business.",
                next_steps:
                  "Tap the WhatsApp link to contact the business and confirm your booking.",
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
