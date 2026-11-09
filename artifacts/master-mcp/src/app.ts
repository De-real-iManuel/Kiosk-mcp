import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import pinoHttp from "pino-http";
import pino from "pino";
import { createMcpServer } from "./server.js";
import { mcpRateLimiter } from "./lib/rateLimiter.js";
import { beginMcpRequest, runWithMcpRequestContext } from "@workspace/db";

const logger = pino({ name: "kiosk-master-mcp" });

export function createApp(): express.Express {
  const app = express();

  // Master MCP is exposed through one AWS Application Load Balancer.
  // The ECS task security group must not permit direct public ingress.
  app.set("trust proxy", 1);

  // Parse JSON bodies before MCP transport handles requests
  app.use(express.json({ limit: "64kb" }));

  // HTTP request logging
  app.use(pinoHttp({ logger }));

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "kiosk-master-mcp" });
  });

  // MCP endpoint — Streamable HTTP transport handles GET, POST, and DELETE.
  //
  // GET  /mcp  — ChatGPT and other clients probe this first to verify the server.
  //              The MCP spec requires Accept: text/event-stream on GET requests.
  //              Some clients (including ChatGPT's connector verifier) send a bare
  //              GET without the correct Accept header and expect a 200, not 406.
  //              We handle this ourselves: if the client wants SSE, open the stream;
  //              otherwise return 200 so the URL validation passes.
  //
  // POST /mcp  — actual JSON-RPC tool calls (tools/list, tools/call, etc.)
  //
  // DELETE /mcp — session termination

  app.get("/mcp", mcpRateLimiter, async (req: Request, res: Response): Promise<void> => {
    const context = beginMcpRequest(req, res, "master_mcp");
    const accept = req.headers["accept"] ?? "";
    if (accept.includes("text/event-stream")) {
      // Proper SSE probe — let the transport handle it
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      try {
        await server.connect(transport);
        await runWithMcpRequestContext(context, () =>
          transport.handleRequest(req, res, req.body),
        );
      } catch (err) {
        logger.error({ err }, "Error handling GET /mcp");
        if (!res.headersSent)
          res.status(500).json({ error: "Internal server error" });
      }
    } else {
      // Client is probing to check the URL is valid (e.g. ChatGPT connector verifier).
      // Return 200 with a minimal SSE-compatible response so validation passes.
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200);
      res.write(": kiosk-master-mcp ready\n\n");
      res.end();
    }
  });

  app.post("/mcp", mcpRateLimiter, async (req: Request, res: Response): Promise<void> => {
    const context = beginMcpRequest(req, res, "master_mcp");
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    try {
      await server.connect(transport);
      await runWithMcpRequestContext(context, () =>
        transport.handleRequest(req, res, req.body),
      );
    } catch (err) {
      logger.error({ err }, "Error handling POST /mcp");
      if (!res.headersSent)
        res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/mcp", mcpRateLimiter, async (req: Request, res: Response): Promise<void> => {
    beginMcpRequest(req, res, "master_mcp");
    res.status(200).json({ ok: true });
  });

  return app;
}

export async function startServer(port: number): Promise<void> {
  const app = createApp();

  const server = app.listen(port, () => {
    logger.info({ port }, "kiosk-master-mcp listening");
  });

  const shutdown = (): void => {
    logger.info("Shutting down kiosk-master-mcp...");
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
