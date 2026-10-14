import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import pinoHttp from "pino-http";
import pino from "pino";
import { createMcpServer } from "./server.js";

const logger = pino({ name: "kiosk-master-mcp" });

export function createApp(): express.Express {
  const app = express();

  // Parse JSON bodies before MCP transport handles requests
  app.use(express.json());

  // HTTP request logging
  app.use(pinoHttp({ logger }));

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "kiosk-master-mcp" });
  });

  // MCP endpoint — Streamable HTTP transport handles GET, POST, and DELETE.
  //
  // GET  /mcp  — ChatGPT, Claude Desktop, and other clients probe this first
  //              to check for SSE support. The SDK handles it correctly.
  //              Without this route, clients get 404 and reject the URL.
  //
  // POST /mcp  — actual JSON-RPC tool calls (tools/list, tools/call, etc.)
  //
  // DELETE /mcp — session termination (some clients send this on disconnect)

  const mcpHandler = async (req: Request, res: Response): Promise<void> => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error({ err }, "Error handling MCP request");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };

  app.get("/mcp", mcpHandler);
  app.post("/mcp", mcpHandler);
  app.delete("/mcp", mcpHandler);

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
