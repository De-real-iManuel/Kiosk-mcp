import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses.js";

export const businessProductsTable = pgTable(
  "business_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businessesTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    price: text("price"),
    available: boolean("available").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("business_products_business_idx").on(table.businessId)],
);

export const insertProductSchema = createInsertSchema(
  businessProductsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertBusinessProduct = z.infer<typeof insertProductSchema>;
export type BusinessProduct = typeof businessProductsTable.$inferSelect;
