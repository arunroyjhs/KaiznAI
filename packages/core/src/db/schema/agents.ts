import { pgTable, uuid, text, timestamp, jsonb, integer, varchar } from 'drizzle-orm/pg-core';

export const agentRegistrations = pgTable('agent_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  runtime: varchar('runtime', { length: 50 }).notNull(),
  name: text('name').notNull(),
  version: varchar('version', { length: 50 }),
  capabilities: jsonb('capabilities').$type<string[]>().default([]),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  lastHeartbeat: timestamp('last_heartbeat').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('idle').notNull(),
  currentExperimentId: uuid('current_experiment_id'),
  orgId: uuid('org_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
});

export const agentActions = pgTable('agent_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull(),
  experimentId: uuid('experiment_id').notNull(),
  action: text('action').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  filesAffected: jsonb('files_affected').$type<string[]>(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  orgId: uuid('org_id').notNull(),
});
