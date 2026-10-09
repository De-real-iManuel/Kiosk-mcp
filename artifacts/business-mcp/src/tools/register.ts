import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { BusinessSession } from '../businessSession.js'
import { registerBaseTools } from './base.js'
import { registerOptionalTools } from './optional.js'
import { buildToolList } from './index.js'

export function registerBusinessTools(server: McpServer, session: BusinessSession): void {
  const enabledTools = buildToolList(session.enabledCapabilityKeys)
  registerBaseTools(server, session)
  registerOptionalTools(server, session, enabledTools)
}
