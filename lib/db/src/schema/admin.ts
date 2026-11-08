import { createInsertSchema } from "drizzle-zod";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { businessesTable } from "./businesses.js";

export const adminUsersTable = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Subject from the configured trusted identity provider (e.g. Cognito / IAM Identity Center).
    identityProvider: text("identity_provider").notNull(),
    identitySubject: text("identity_subject").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [
    index("admin_users_identity_idx").on(table.identityProvider, table.identitySubject),
    index("admin_users_status_role_idx").on(table.status, table.role),
  ],
);

export const adminAuditLogsTable = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id").references(() => adminUsersTable.id, { onDelete: "set null" }),
    actorIdentity: text("actor_identity").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    reason: text("reason"),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_actor_date_idx").on(table.adminUserId, table.createdAt),
    index("admin_audit_logs_resource_idx").on(table.resourceType, table.resourceId, table.createdAt),
    index("admin_audit_logs_action_date_idx").on(table.action, table.createdAt),
  ],
);

export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketNumber: text("ticket_number").notNull().unique(),
    businessId: uuid("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    priority: text("priority").notNull().default("normal"),
    status: text("status").notNull().default("open"),
    assignedAdminId: uuid("assigned_admin_id").references(() => adminUsersTable.id, { onDelete: "set null" }),
    createdByIdentity: text("created_by_identity").notNull(),
    resolution: text("resolution"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("support_tickets_status_priority_idx").on(table.status, table.priority, table.createdAt),
    index("support_tickets_business_idx").on(table.businessId, table.createdAt),
    index("support_tickets_assignee_idx").on(table.assignedAdminId, table.status),
  ],
);

export const supportNotesTable = pgTable(
  "support_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id").notNull().references(() => supportTicketsTable.id, { onDelete: "cascade" }),
    authorAdminId: uuid("author_admin_id").references(() => adminUsersTable.id, { onDelete: "set null" }),
    authorIdentity: text("author_identity").notNull(),
    body: text("body").notNull(),
    visibility: text("visibility").notNull().default("internal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("support_notes_ticket_date_idx").on(table.ticketId, table.createdAt)],
);

export const incidentsTable = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentNumber: text("incident_number").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    affectedService: text("affected_service").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("investigating"),
    assignedAdminId: uuid("assigned_admin_id").references(() => adminUsersTable.id, { onDelete: "set null" }),
    createdByIdentity: text("created_by_identity").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("incidents_status_severity_idx").on(table.status, table.severity, table.startedAt),
    index("incidents_service_date_idx").on(table.affectedService, table.startedAt),
  ],
);

export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogsTable).omit({ id: true, createdAt: true });
export const insertSupportTicketSchema = createInsertSchema(supportTicketsTable).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });
export const insertSupportNoteSchema = createInsertSchema(supportNotesTable).omit({ id: true, createdAt: true });
export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true, createdAt: true, updatedAt: true, startedAt: true, resolvedAt: true });

export type AdminUser = typeof adminUsersTable.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogsTable.$inferSelect;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportNote = typeof supportNotesTable.$inferSelect;
export type Incident = typeof incidentsTable.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type InsertSupportNote = z.infer<typeof insertSupportNoteSchema>;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
