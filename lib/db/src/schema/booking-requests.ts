import { createInsertSchema } from "drizzle-zod";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses.js";

/**
 * Booking request status lifecycle:
 *
 *   pending  → confirmed  (business confirms out-of-band)
 *   pending  → declined   (business declines)
 *   pending  → cancelled  (customer cancels before confirmation)
 *
 * Kiosk does NOT provide real-time availability or calendar integration.
 * A booking_request is an inquiry — not a confirmed reservation.
 * The business owner confirms via WhatsApp, phone, or their own system.
 */
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
]);

export const bookingRequestsTable = pgTable(
  "booking_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businessesTable.id, { onDelete: "cascade" })
      .notNull(),
    bookingRef: text("booking_ref").notNull().unique(),
    serviceName: text("service_name").notNull(),
    preferredDate: text("preferred_date").notNull(), // YYYY-MM-DD
    preferredTime: text("preferred_time").notNull(), // HH:MM
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    notes: text("notes"),
    status: bookingStatusEnum("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("booking_requests_business_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("booking_requests_ref_idx").on(table.bookingRef),
    index("booking_requests_status_idx").on(table.businessId, table.status),
  ],
);

export const insertBookingRequestSchema = createInsertSchema(
  bookingRequestsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBookingRequest = z.infer<typeof insertBookingRequestSchema>;
export type BookingRequest = typeof bookingRequestsTable.$inferSelect;
