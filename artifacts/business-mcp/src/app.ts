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
  // Each POST /mcp/business/:slug request is handled as an independent session
  // for the business identified by the slug.
  app.post(
    "/mcp/business/:slug",
    mcpRateLimiter,
    async (req: Request, res: Response) => {
      const slug = req.params["slug"] as string;
      const reqId = (req as Request & { id?: string }).id ?? "unknown";

      // Resolve the business session first — bail out if the slug is unknown
      // or the business is not published/active.
      let session: Awaited<ReturnType<typeof resolveBusinessSession>>;
      try {
        session = await resolveBusinessSession(slug);
      } catch (err) {
        logger.error(
          { err, slug, reqId },
          "Failed to resolve business session",
        );
        if (!res.headersSent) {
          res.status(404).json({ error: "Business not found" });
        }
        return;
      }

      // Fire-and-forget session_start event (non-critical)
      db.insert(agentEventsTable)
        .values({
          businessId: session.business.id,
          eventType: "session_start",
          toolName: null,
          metadata: { slug, reqId },
        })
        .catch(() => {});

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
    },
  );

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
