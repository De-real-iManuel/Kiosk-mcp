import { createInsertSchema } from "drizzle-zod";
import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses";

export const agentEventsTable = pgTable(
  "agent_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    toolName: text("tool_name"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("agent_events_business_idx").on(table.businessId, table.createdAt),
    index("agent_events_tool_idx").on(table.toolName, table.createdAt),
  ],
);

export const insertAgentEventSchema = createInsertSchema(agentEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentEvent = z.infer<typeof insertAgentEventSchema>;
export type AgentEvent = typeof agentEventsTable.$inferSelect;
