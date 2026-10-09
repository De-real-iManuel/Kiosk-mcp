import express, { type Request, type Response } from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import pinoHttp from 'pino-http'
import pino from 'pino'
import { db, agentEventsTable } from '@workspace/db'
import { createBusinessMcpServer } from './server.js'
import { resolveBusinessSession } from './businessSession.js'
import { registerBusinessTools } from './tools/register.js'

const logger = pino({ name: 'kiosk-business-mcp' })

export function createApp(): express.Express {
  const app = express()

  // Parse JSON bodies before MCP transport handles requests
  app.use(express.json())

  // HTTP request logging
  app.use(pinoHttp({ logger }))

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'kiosk-business-mcp' })
  })

  // MCP endpoint — per-tenant stateless mode (sessionIdGenerator: undefined)
  // Each POST /mcp/business/:slug request is handled as an independent session
  // for the business identified by the slug.
  app.post('/mcp/business/:slug', async (req: Request, res: Response) => {
    const slug = req.params['slug'] as string

    try {
      // Resolve the business session for this tenant
      const session = await resolveBusinessSession(slug)
      // Fire-and-forget session_start event (non-critical)
      db.insert(agentEventsTable).values({
        businessId: session.business.id,
        eventType: 'session_start',
        toolName: null,
        metadata: { slug },
      }).catch(() => {})
    } catch (err) {
      logger.error({ err, slug }, 'Failed to resolve business session')
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to resolve business session' })
      }
      return
    }

    const server = createBusinessMcpServer(slug)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (err) {
      logger.error({ err, slug }, 'Error handling MCP request')
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  })

  return app
}

export async function startServer(port: number): Promise<void> {
  const app = createApp()

  const server = app.listen(port, () => {
    logger.info({ port }, 'kiosk-business-mcp listening')
  })

  const shutdown = (): void => {
    logger.info('Shutting down kiosk-business-mcp...')
    server.close(() => {
      logger.info('Server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
