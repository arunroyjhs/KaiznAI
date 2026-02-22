import { pgTable, uuid, text, timestamp, jsonb, integer, interval } from 'drizzle-orm/pg-core';
import { orgs, workspaces } from './orgs.js';

export const outcomes = pgTable('outcomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'),

  primarySignal: jsonb('primary_signal').notNull(),
  secondarySignals: jsonb('secondary_signals').default([]),

  target: jsonb('target').notNull(),
  constraints: jsonb('constraints').notNull().default([]),

  maxConcurrentExperiments: integer('max_concurrent_experiments').default(3),
  horizon: interval('horizon').notNull(),
  deadline: timestamp('deadline', { withTimezone: true }),

  owner: text('owner').notNull(),
  teamMembers: text('team_members').array().default([]),

  orgId: uuid('org_id').notNull().references(() => orgs.id),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  achievedAt: timestamp('achieved_at', { withTimezone: true }),
});
