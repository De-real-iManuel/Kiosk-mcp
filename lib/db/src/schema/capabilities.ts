import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses.js";

export const capabilityEnum = pgEnum("capability", [
  "menu",
  "ordering",
  "delivery",
  "booking",
  "contact",
  "products",
  "services",
  "information",
]);

export const businessCapabilitiesTable = pgTable(
  "business_capabilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businessesTable.id, { onDelete: "cascade" })
      .notNull(),
    capability: capabilityEnum("capability").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    configuration: jsonb("configuration").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("business_capabilities_unique").on(
      table.businessId,
      table.capability,
    ),
  ],
);

export const insertCapabilitySchema = createInsertSchema(
  businessCapabilitiesTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertBusinessCapability = z.infer<typeof insertCapabilitySchema>;
export type BusinessCapability = typeof businessCapabilitiesTable.$inferSelect;
