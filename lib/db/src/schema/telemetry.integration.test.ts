import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../index.js";
import {
  adminUsersTable,
  agentEventsTable,
  mcpRequestEventsTable,
  mcpToolEventsTable,
} from "./index.js";

const requestIds: string[] = [];
const adminIds: string[] = [];
const feedbackIds: string[] = [];

afterAll(async () => {
  if (requestIds.length) {
    await db
      .delete(mcpToolEventsTable)
      .where(
        and(
          ...requestIds.map((requestId) =>
            eq(mcpToolEventsTable.requestId, requestId),
          ),
        ),
      );
    await db
      .delete(mcpRequestEventsTable)
      .where(
        and(
          ...requestIds.map((requestId) =>
            eq(mcpRequestEventsTable.requestId, requestId),
          ),
        ),
      );
  }

  if (feedbackIds.length) {
    await db
      .delete(agentEventsTable)
      .where(
        and(...feedbackIds.map((id) => eq(agentEventsTable.id, id))),
      );
  }

  if (adminIds.length) {
    await db
      .delete(adminUsersTable)
      .where(and(...adminIds.map((id) => eq(adminUsersTable.id, id))));
  }
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

    await db
      .update(mcpRequestEventsTable)
      .set({
        httpStatus: 200,
        outcome: "success",
        durationMs: 17,
        completedAt: new Date(),
      })
      .where(eq(mcpRequestEventsTable.requestId, requestId));

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

    const [request] = await db
      .select()
      .from(mcpRequestEventsTable)
      .where(eq(mcpRequestEventsTable.requestId, requestId))
      .limit(1);
    const [tool] = await db
      .select()
      .from(mcpToolEventsTable)
      .where(eq(mcpToolEventsTable.requestId, requestId))
      .limit(1);

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

  it("stores onboarding feedback answers as agent-event JSON metadata", async () => {
    const [event] = await db
      .insert(agentEventsTable)
      .values({
        businessId: null,
        eventType: "onboarding_feedback",
        toolName: "feedback_form",
        metadata: {
          howCustomersFindYou: "Instagram and referrals",
          wouldPay: "Yes",
          wouldPayPriority: "Maybe",
          monthlyAdSpend: "Under ₦5,000",
          wouldRefer: "Yes",
          oneThing: "More customer enquiries",
        },
      })
      .returning({ id: agentEventsTable.id });
    feedbackIds.push(event!.id);

    const [stored] = await db
      .select({
        eventType: agentEventsTable.eventType,
        toolName: agentEventsTable.toolName,
        metadata: agentEventsTable.metadata,
      })
      .from(agentEventsTable)
      .where(eq(agentEventsTable.id, event!.id))
      .limit(1);

    expect(stored).toMatchObject({
      eventType: "onboarding_feedback",
      toolName: "feedback_form",
      metadata: {
        howCustomersFindYou: "Instagram and referrals",
        wouldPay: "Yes",
        wouldPayPriority: "Maybe",
        monthlyAdSpend: "Under ₦5,000",
        wouldRefer: "Yes",
        oneThing: "More customer enquiries",
      },
    });
  });

  it("enforces the unique issuer and subject mapping for admin identities", async () => {
    const identityProvider = `https://admin-test.example/${randomUUID()}`;
    const identitySubject = randomUUID();
    const [admin] = await db
      .insert(adminUsersTable)
      .values({
        identityProvider,
        identitySubject,
        email: "integration-admin@example.test",
        role: "technical_admin",
        status: "active",
      })
      .returning({ id: adminUsersTable.id });
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

    const matches = await db
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(
        and(
          eq(adminUsersTable.identityProvider, identityProvider),
          eq(adminUsersTable.identitySubject, identitySubject),
        ),
      );
    expect(matches).toHaveLength(1);
  });
});
