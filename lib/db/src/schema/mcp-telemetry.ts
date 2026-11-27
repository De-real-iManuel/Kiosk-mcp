import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses.js";

export const mcpRequestEventsTable = pgTable(
  "mcp_request_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: text("request_id").notNull().unique(),
    endpoint: text("endpoint").notNull(),
    businessId: uuid("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    httpMethod: text("http_method").notNull(),
    rpcMethod: text("rpc_method"),
    requestedTool: text("requested_tool"),
    clientName: text("client_name"),
    clientVersion: text("client_version"),
    userAgent: text("user_agent"),
    protocolVersion: text("protocol_version"),
    clientIdentityStatus: text("client_identity_status")
      .notNull()
      .default("unknown"),
    clientIdentitySource: text("client_identity_source"),
    httpStatus: integer("http_status"),
    outcome: text("outcome").notNull().default("started"),
    durationMs: integer("duration_ms"),
    requestBytes: integer("request_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("mcp_request_events_endpoint_date_idx").on(
      table.endpoint,
      table.createdAt,
    ),
    index("mcp_request_events_client_date_idx").on(
      table.clientName,
      table.createdAt,
    ),
    index("mcp_request_events_outcome_date_idx").on(
      table.outcome,
      table.createdAt,
    ),
    index("mcp_request_events_business_date_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("mcp_request_events_rpc_date_idx").on(
      table.rpcMethod,
      table.createdAt,
    ),
  ],
);

export const mcpToolEventsTable = pgTable(
  "mcp_tool_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: text("request_id"),
    endpoint: text("endpoint").notNull(),
    businessId: uuid("business_id").references(() => businessesTable.id, {
      onDelete: "set null",
    }),
    toolName: text("tool_name").notNull(),
    clientName: text("client_name"),
    clientVersion: text("client_version"),
    clientIdentityStatus: text("client_identity_status")
      .notNull()
      .default("unknown"),
    succeeded: boolean("succeeded").notNull(),
    durationMs: integer("duration_ms"),
    resultCount: integer("result_count"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("mcp_tool_events_tool_date_idx").on(table.toolName, table.createdAt),
    index("mcp_tool_events_endpoint_date_idx").on(
      table.endpoint,
      table.createdAt,
    ),
    index("mcp_tool_events_client_date_idx").on(
      table.clientName,
      table.createdAt,
    ),
    index("mcp_tool_events_business_date_idx").on(
      table.businessId,
      table.createdAt,
    ),
    index("mcp_tool_events_request_idx").on(table.requestId),
  ],
);

export const insertMcpRequestEventSchema = createInsertSchema(
  mcpRequestEventsTable,
).omit({ id: true, createdAt: true });
export const insertMcpToolEventSchema = createInsertSchema(
  mcpToolEventsTable,
).omit({ id: true, createdAt: true });
export type McpRequestEvent = typeof mcpRequestEventsTable.$inferSelect;
export type McpToolEvent = typeof mcpToolEventsTable.$inferSelect;
export type InsertMcpRequestEvent = z.infer<typeof insertMcpRequestEventSchema>;
export type InsertMcpToolEvent = z.infer<typeof insertMcpToolEventSchema>;
