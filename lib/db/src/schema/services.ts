import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const businessServicesTable = pgTable(
  "business_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
      .references(() => businessesTable.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: text("price"),
    available: boolean("available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("business_services_business_idx").on(table.businessId)],
);

export const insertServiceSchema = createInsertSchema(
  businessServicesTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertBusinessService = z.infer<typeof insertServiceSchema>;
export type BusinessService = typeof businessServicesTable.$inferSelect;
