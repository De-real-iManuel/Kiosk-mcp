import { createInsertSchema } from "drizzle-zod";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const marketplaceEventsTable = pgTable(
  "marketplace_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("marketplace_events_business_date_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("marketplace_events_business_type_date_idx").on(
      table.businessId,
      table.eventType,
      table.createdAt,
    ),
  ],
);

export const insertMarketplaceEventSchema = createInsertSchema(
  marketplaceEventsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketplaceEvent = z.infer<
  typeof insertMarketplaceEventSchema
>;
export type MarketplaceEvent = typeof marketplaceEventsTable.$inferSelect;
