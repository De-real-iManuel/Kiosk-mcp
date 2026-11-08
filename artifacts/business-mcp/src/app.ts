import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import pinoHttp from "pino-http";
import pino from "pino";
import { db, agentEventsTable } from "@workspace/db";
import { createBusinessMcpServer } from "./server.js";
import { resolveBusinessSession } from "./businessSession.js";
import { registerBusinessTools } from "./tools/register.js";
import { mcpRateLimiter } from "./lib/rateLimiter.js";
import {
  beginMcpRequest,
  instrumentMcpServer,
  runWithMcpRequestContext,
  setMcpRequestBusinessId,
} from "@workspace/db";

const logger = pino({ name: "kiosk-business-mcp" });

export function createApp(): express.Express {
  const app = express();

  // Parse JSON bodies before MCP transport handles requests
  app.use(express.json());

  // Attach a unique request ID to every request for structured log correlation
  app.use((req: Request, _res: Response, next) => {
    (req as Request & { id: string }).id = randomUUID();
    next();
  });

  // HTTP request logging with request ID
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as Request & { id?: string }).id ?? randomUUID(),
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "kiosk-business-mcp" });
  });

  // MCP endpoint — per-tenant stateless mode (sessionIdGenerator: undefined)
  // Handles GET, POST, and DELETE — all required by Streamable HTTP clients.
  // GET  /mcp/business/:slug  — clients probe this first; without it they get 404 and reject the URL
  // POST /mcp/business/:slug  — actual JSON-RPC tool calls
  // DELETE /mcp/business/:slug — session termination

  const businessMcpHandler = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const slug = req.params["slug"] as string;
    const reqId = (req as Request & { id?: string }).id ?? "unknown";
    const telemetryContext = beginMcpRequest(req, res, "business_mcp");

    // For GET requests (client capability probe), resolve session to verify
    // the slug is valid before handing off to the transport.
    let session: Awaited<ReturnType<typeof resolveBusinessSession>>;
    try {
      session = await resolveBusinessSession(slug);
    } catch (err) {
      logger.error({ err, slug, reqId }, "Failed to resolve business session");
      if (!res.headersSent) {
        res.status(404).json({ error: "Business not found" });
      }
      return;
    }

    // Fire-and-forget session_start event on POST only (not on GET probe)
    if (req.method === "POST") {
      db.insert(agentEventsTable)
        .values({
          businessId: session.business.id,
          eventType: "session_start",
          toolName: null,
          metadata: { slug, reqId },
        })
        .catch(() => {});
    }

    const server = createBusinessMcpServer(slug);
    registerBusinessTools(server, session);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error({ err, slug, reqId }, "Error handling MCP request");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };

  app.get("/mcp/business/:slug", mcpRateLimiter, businessMcpHandler);
  app.post("/mcp/business/:slug", mcpRateLimiter, businessMcpHandler);
  app.delete("/mcp/business/:slug", mcpRateLimiter, businessMcpHandler);

  return app;
}

export async function startServer(port: number): Promise<void> {
  const app = createApp();

  const server = app.listen(port, () => {
    logger.info({ port }, "kiosk-business-mcp listening");
  });

  const shutdown = (): void => {
    logger.info("Shutting down kiosk-business-mcp...");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
