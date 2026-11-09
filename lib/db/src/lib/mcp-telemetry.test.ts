import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserts: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("../db.js", () => ({
  db: {
    insert: () => ({
      values: async (value: Record<string, unknown>) => {
        state.inserts.push(value);
        return [];
      },
    }),
    update: () => ({
      set: (value: Record<string, unknown>) => ({
        where: async () => {
          state.updates.push(value);
          return [];
        },
      }),
    }),
  },
}));

import {
  beginMcpRequest,
  instrumentMcpServer,
  runWithMcpRequestContext,
} from "./mcp-telemetry.js";

class FakeResponse extends EventEmitter {
  statusCode = 200;
  writableFinished = false;
  finish() {
    this.writableFinished = true;
    this.emit("finish");
    this.emit("close");
  }
  abort() {
    this.writableFinished = false;
    this.emit("close");
  }
}

beforeEach(() => {
  state.inserts.length = 0;
  state.updates.length = 0;
});

describe("MCP telemetry", () => {
  it("persists allowlisted request metadata without storing authorization values", async () => {
    const response = new FakeResponse();
    beginMcpRequest(
      {
        method: "POST",
        headers: {
          authorization: "Bearer must-never-be-stored",
          "user-agent": "ChatGPT-Connector/1.0",
          "mcp-protocol-version": "2025-03-26",
        },
        body: {
          jsonrpc: "2.0",
          method: "initialize",
          params: { clientInfo: { name: "ChatGPT", version: "1.2.3" } },
        },
      },
      response,
      "master_mcp",
    );

    await vi.waitFor(() => expect(state.inserts).toHaveLength(1));
    const row = state.inserts[0]!;
    expect(row.endpoint).toBe("master_mcp");
    expect(row.rpcMethod).toBe("initialize");
    expect(row.clientName).toBe("ChatGPT");
    expect(row.clientVersion).toBe("1.2.3");
    expect(row.clientIdentityStatus).toBe("inferred");
    expect(row.protocolVersion).toBe("2025-03-26");
    expect(JSON.stringify(row)).not.toContain("must-never-be-stored");

    response.finish();
    await vi.waitFor(() => expect(state.updates).toHaveLength(1));
    expect(state.updates[0]?.outcome).toBe("success");
  });

  it("marks a disconnected request as aborted exactly once", async () => {
    const response = new FakeResponse();
    beginMcpRequest(
      { method: "POST", headers: {}, body: { method: "tools/list" } },
      response,
      "master_mcp",
    );
    await vi.waitFor(() => expect(state.inserts).toHaveLength(1));

    response.abort();
    response.emit("close");
    await vi.waitFor(() => expect(state.updates).toHaveLength(1));
    expect(state.updates[0]?.outcome).toBe("aborted");
  });

  it("records each registered tool execution with its request context", async () => {
    const response = new FakeResponse();
    const context = beginMcpRequest(
      {
        method: "POST",
        headers: { "user-agent": "Claude/1.0" },
        body: { method: "tools/call", params: { name: "search_businesses" } },
      },
      response,
      "master_mcp",
    );

    const registered: Array<(...args: unknown[]) => Promise<unknown>> = [];
    const server = {
      tool: (...args: unknown[]) => {
        const handler = args[args.length - 1];
        if (typeof handler === "function")
          registered.push(handler as (...args: unknown[]) => Promise<unknown>);
      },
    };
    instrumentMcpServer(server, "master_mcp");
    server.tool("search_businesses", "Search businesses", async () => ({
      content: [{ type: "text", text: '[{"id":1},{"id":2}]' }],
    }));

    await runWithMcpRequestContext(context, async () => {
      await registered[0]!();
    });
    await vi.waitFor(() => expect(state.inserts).toHaveLength(2));
    const toolEvent = state.inserts.find(
      (row) => row.toolName === "search_businesses",
    );
    expect(toolEvent).toMatchObject({
      requestId: context.requestId,
      endpoint: "master_mcp",
      clientName: "Claude client",
      clientIdentityStatus: "inferred",
      succeeded: true,
      resultCount: 2,
    });
  });

  it("records thrown tool handlers as failed and rethrows the original error", async () => {
    const registered: Array<(...args: unknown[]) => Promise<unknown>> = [];
    const server = {
      tool: (...args: unknown[]) => {
        const handler = args[args.length - 1];
        if (typeof handler === "function")
          registered.push(handler as (...args: unknown[]) => Promise<unknown>);
      },
    };
    instrumentMcpServer(server, "business_mcp", "business-123");
    server.tool("get_business", "Get business", async () => {
      throw new Error("internal detail");
    });

    await expect(registered[0]!()).rejects.toThrow("internal detail");
    await vi.waitFor(() => expect(state.inserts).toHaveLength(1));
    expect(state.inserts[0]).toMatchObject({
      endpoint: "business_mcp",
      businessId: "business-123",
      toolName: "get_business",
      succeeded: false,
      errorCode: "TOOL_EXECUTION_ERROR",
    });
  });
});
