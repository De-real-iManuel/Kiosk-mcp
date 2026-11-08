import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, mcpRequestEventsTable, mcpToolEventsTable } from "../index.js";

type JsonObject = Record<string, unknown>;
type RequestLike = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ResponseLike = {
  statusCode: number;
  once: (event: "finish", listener: () => void) => unknown;
};

export interface McpRequestContext {
  requestId: string;
  endpoint: string;
  businessId: string | null;
  clientName: string | null;
  clientVersion: string | null;
  clientIdentityStatus: "unknown" | "inferred";
}

const requestContext = new AsyncLocalStorage<McpRequestContext>();
const requestInsertPromises = new WeakMap<McpRequestContext, Promise<unknown>>();

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function headerValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/**
 * Persist one inbound HTTP request. MCP clientInfo and User-Agent are
 * self-asserted metadata, never cryptographic proof of vendor identity.
 */
export function beginMcpRequest(
  req: RequestLike,
  res: ResponseLike,
  endpoint: string,
  businessId: string | null = null,
): McpRequestContext {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const body = asObject(req.body);
  const params = asObject(body?.params);
  const clientInfo = asObject(params?.clientInfo);
  const clientName =
    typeof clientInfo?.name === "string" ? clientInfo.name.slice(0, 160) : null;
  const clientVersion =
    typeof clientInfo?.version === "string"
      ? clientInfo.version.slice(0, 80)
      : null;
  const rpcMethod =
    typeof body?.method === "string" ? body.method.slice(0, 120) : null;
  const requestedTool =
    rpcMethod === "tools/call" && typeof params?.name === "string"
      ? params.name.slice(0, 160)
      : null;
  const userAgent = headerValue(req.headers["user-agent"]);
  const protocolVersion = headerValue(req.headers["mcp-protocol-version"]);
  const context: McpRequestContext = {
    requestId,
    endpoint,
    businessId,
    clientName,
    clientVersion,
    clientIdentityStatus: clientName ? "inferred" : "unknown",
  };

  const insertPromise = db
    .insert(mcpRequestEventsTable)
    .values({
      requestId,
      endpoint,
      businessId,
      httpMethod: req.method,
      rpcMethod,
      requestedTool,
      clientName,
      clientVersion,
      userAgent: userAgent?.slice(0, 512) ?? null,
      protocolVersion: protocolVersion?.slice(0, 80) ?? null,
      clientIdentityStatus: context.clientIdentityStatus,
      clientIdentitySource: clientName
        ? "mcp_client_info"
        : userAgent
          ? "user_agent_only"
          : null,
      requestBytes: body ? Buffer.byteLength(JSON.stringify(body)) : null,
      outcome: "started",
    })
    .catch((error: unknown) => {
      console.error("[mcp-telemetry] Failed to persist request start", error);
    });

  requestInsertPromises.set(context, insertPromise);

  res.once("finish", () => {
    void insertPromise.then(async () => {
      try {
        await db
          .update(mcpRequestEventsTable)
          .set({
            httpStatus: res.statusCode,
            outcome: res.statusCode >= 400 ? "error" : "success",
            durationMs: Math.max(0, Date.now() - startedAt),
            completedAt: new Date(),
          })
          .where(eq(mcpRequestEventsTable.requestId, requestId));
      } catch (error) {
        console.error("[mcp-telemetry] Failed to complete request event", error);
      }
    });
  });

  return context;
}

export function runWithMcpRequestContext<T>(
  context: McpRequestContext,
  callback: () => T,
): T {
  return requestContext.run(context, callback);
}

export function setMcpRequestBusinessId(
  context: McpRequestContext,
  businessId: string,
): void {
  context.businessId = businessId;
  const inserted = requestInsertPromises.get(context) ?? Promise.resolve();
  void inserted.then(() =>
    db
      .update(mcpRequestEventsTable)
      .set({ businessId })
      .where(eq(mcpRequestEventsTable.requestId, context.requestId))
      .catch((error: unknown) => {
        console.error("[mcp-telemetry] Failed to attach business to request", error);
      }),
  );
}

/**
 * Wraps all tools registered on an MCP server so every handler is measured.
 * The SDK's legacy tool() registration shape places the handler last.
 */
export function instrumentMcpServer(
  server: { tool: (...args: any[]) => any },
  endpoint: string,
  businessId: string | null = null,
): void {
  const originalTool = server.tool.bind(server);
  server.tool = (...args: any[]) => {
    const handlerIndex = args.length - 1;
    const handler = args[handlerIndex];
    if (typeof handler === "function") {
      const toolName = typeof args[0] === "string" ? args[0] : "unknown_tool";
      args[handlerIndex] = async (...handlerArgs: unknown[]) => {
        const startedAt = Date.now();
        let succeeded = false;
        let resultCount: number | null = null;
        let errorCode: string | null = null;
        try {
          const result = await handler(...handlerArgs);
          succeeded = !(asObject(result)?.isError === true);
          if (!succeeded) errorCode = "TOOL_RETURNED_ERROR";
          const resultObject = asObject(result);
          const firstText = Array.isArray(resultObject?.content)
            ? asObject(resultObject.content[0])?.text
            : null;
          if (typeof firstText === "string") {
            try {
              const parsed: unknown = JSON.parse(firstText);
              resultCount = Array.isArray(parsed) ? parsed.length : null;
            } catch {
              resultCount = null;
            }
          }
          return result;
        } catch (error) {
          const err = asObject(error);
          errorCode =
            typeof err?.code === "string"
              ? err.code.slice(0, 120)
              : "TOOL_EXECUTION_ERROR";
          throw error;
        } finally {
          const context = requestContext.getStore();
          void db
            .insert(mcpToolEventsTable)
            .values({
              requestId: context?.requestId ?? null,
              endpoint: context?.endpoint ?? endpoint,
              businessId: context?.businessId ?? businessId,
              toolName: toolName.slice(0, 160),
              clientName: context?.clientName ?? null,
              clientVersion: context?.clientVersion ?? null,
              clientIdentityStatus: context?.clientIdentityStatus ?? "unknown",
              succeeded,
              durationMs: Math.max(0, Date.now() - startedAt),
              resultCount,
              errorCode,
            })
            .catch((error: unknown) => {
              console.error("[mcp-telemetry] Failed to persist tool event", error);
            });
        }
      };
    }
    return originalTool(...args);
  };
}
