import { createInsertSchema } from "drizzle-zod";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const businessEndpointsTable = pgTable(
  "business_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    endpointUrl: text("endpoint_url").notNull(),
    transport: text("transport").notNull().default("streamable-http"),
    status: text("status").notNull().default("active"),
    capabilities: jsonb("capabilities").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("business_endpoints_business_unique").on(table.businessId),
    index("business_endpoints_status_idx").on(table.status),
  ],
);

export const insertEndpointSchema = createInsertSchema(
  businessEndpointsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBusinessEndpoint = z.infer<typeof insertEndpointSchema>;
export type BusinessEndpoint = typeof businessEndpointsTable.$inferSelect;
