import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, pool } from "../index.js";
import {
  adminUsersTable,
  mcpRequestEventsTable,
  mcpToolEventsTable,
} from "./index.js";

const requestIds: string[] = [];
const adminIds: string[] = [];

afterAll(async () => {
  if (requestIds.length) {
    await db.delete(mcpToolEventsTable).where(
      and(...requestIds.map((requestId) => eq(mcpToolEventsTable.requestId, requestId))),
    );
    await db.delete(mcpRequestEventsTable).where(
      and(...requestIds.map((requestId) => eq(mcpRequestEventsTable.requestId, requestId))),
    );
  }
  if (adminIds.length) {
    await db.delete(adminUsersTable).where(
      and(...adminIds.map((id) => eq(adminUsersTable.id, id))),
    );
  }
  await pool.end();
});

describe("PostgreSQL telemetry and admin schema integration", () => {
  it("persists and updates an MCP request with a linked tool execution", async () => {
    const requestId = randomUUID();
    requestIds.push(requestId);

    await db.insert(mcpRequestEventsTable).values({
      requestId,
      endpoint: "master_mcp",
      httpMethod: "POST",
      rpcMethod: "tools/call",
      requestedTool: "search_businesses",
      clientName: "integration-test-client",
      clientVersion: "1.0.0",
      clientIdentityStatus: "inferred",
      clientIdentitySource: "mcp_client_info",
      outcome: "started",
    });

    await db.update(mcpRequestEventsTable).set({
      httpStatus: 200,
      outcome: "success",
      durationMs: 17,
      completedAt: new Date(),
    }).where(eq(mcpRequestEventsTable.requestId, requestId));

    await db.insert(mcpToolEventsTable).values({
      requestId,
      endpoint: "master_mcp",
      toolName: "search_businesses",
      clientName: "integration-test-client",
      clientVersion: "1.0.0",
      clientIdentityStatus: "inferred",
      succeeded: true,
      durationMs: 12,
      resultCount: 3,
    });

    const [request] = await db.select().from(mcpRequestEventsTable)
      .where(eq(mcpRequestEventsTable.requestId, requestId)).limit(1);
    const [tool] = await db.select().from(mcpToolEventsTable)
      .where(eq(mcpToolEventsTable.requestId, requestId)).limit(1);

    expect(request).toMatchObject({
      requestId,
      endpoint: "master_mcp",
      requestedTool: "search_businesses",
      outcome: "success",
      httpStatus: 200,
      durationMs: 17,
    });
    expect(tool).toMatchObject({
      requestId,
      endpoint: "master_mcp",
      toolName: "search_businesses",
      succeeded: true,
      resultCount: 3,
    });
  });

  it("enforces the unique issuer and subject mapping for admin identities", async () => {
    const identityProvider = `https://admin-test.example/${randomUUID()}`;
    const identitySubject = randomUUID();
    const [admin] = await db.insert(adminUsersTable).values({
      identityProvider,
      identitySubject,
      email: "integration-admin@example.test",
      role: "technical_admin",
      status: "active",
    }).returning({ id: adminUsersTable.id });
    adminIds.push(admin!.id);

    await expect(
      db.insert(adminUsersTable).values({
        identityProvider,
        identitySubject,
        email: "duplicate-admin@example.test",
        role: "support_agent",
        status: "active",
      }),
    ).rejects.toThrow();

    const matches = await db.select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(and(
        eq(adminUsersTable.identityProvider, identityProvider),
        eq(adminUsersTable.identitySubject, identitySubject),
      ));
    expect(matches).toHaveLength(1);
  });
});
