import { db, agentEventsTable } from '@workspace/db'

export function recordToolEvent(businessId: string, toolName: string, metadata?: Record<string, unknown>): void {
  db.insert(agentEventsTable).values({
    businessId,
    eventType: 'tool_call',
    toolName,
    metadata: metadata ?? {},
  }).catch(() => { /* non-critical */ })
}
