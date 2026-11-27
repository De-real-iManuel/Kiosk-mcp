import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  adminAuditLogsTable,
  adminUsersTable,
  incidentsTable,
  mcpRequestEventsTable,
  mcpToolEventsTable,
  supportNotesTable,
  supportTicketsTable,
} from "../schema/index.js";

describe("internal operations database schema", () => {
  it("exports the MCP request and tool event tables with their required fields", () => {
    expect(getTableName(mcpRequestEventsTable)).toBe("mcp_request_events");
    expect(getTableName(mcpToolEventsTable)).toBe("mcp_tool_events");

    const requestColumns = getTableConfig(mcpRequestEventsTable).columns.map(
      (column) => column.name,
    );
    expect(requestColumns).toEqual(
      expect.arrayContaining([
        "request_id",
        "endpoint",
        "business_id",
        "rpc_method",
        "requested_tool",
        "client_name",
        "client_version",
        "client_identity_status",
        "http_status",
        "outcome",
        "duration_ms",
        "created_at",
        "completed_at",
      ]),
    );

    const toolColumns = getTableConfig(mcpToolEventsTable).columns.map(
      (column) => column.name,
    );
    expect(toolColumns).toEqual(
      expect.arrayContaining([
        "request_id",
        "endpoint",
        "business_id",
        "tool_name",
        "client_name",
        "client_version",
        "succeeded",
        "duration_ms",
        "result_count",
        "error_code",
      ]),
    );
  });

  it("exports the isolated admin, audit, support and incident tables", () => {
    expect(getTableName(adminUsersTable)).toBe("admin_users");
    expect(getTableName(adminAuditLogsTable)).toBe("admin_audit_logs");
    expect(getTableName(supportTicketsTable)).toBe("support_tickets");
    expect(getTableName(supportNotesTable)).toBe("support_notes");
    expect(getTableName(incidentsTable)).toBe("incidents");
  });

  it("keeps a unique identity mapping for provisioned admin subjects", () => {
    const uniqueIndexes = getTableConfig(adminUsersTable)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name);
    expect(uniqueIndexes).toContain("admin_users_identity_unique");
  });
});
