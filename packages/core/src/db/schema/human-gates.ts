import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { experiments } from './experiments.js';
import { outcomes } from './outcomes.js';
import { orgs } from './orgs.js';

export const humanGates = pgTable('human_gates', {
  id: uuid('id').primaryKey().defaultRandom(),
  experimentId: uuid('experiment_id').notNull().references(() => experiments.id),
  outcomeId: uuid('outcome_id').notNull().references(() => outcomes.id),

  gateType: text('gate_type').notNull(),

  contextPackage: jsonb('context_package').notNull(),
  question: text('question').notNull(),
  signalSnapshot: jsonb('signal_snapshot'),
  options: jsonb('options'),

  assignedTo: text('assigned_to').notNull(),
  escalationChain: text('escalation_chain').array(),
  slaHours: integer('sla_hours').default(24),

  status: text('status').notNull().default('pending'),
  conditions: text('conditions').array(),
  responseNote: text('response_note'),
  decidedBy: text('decided_by'),

  notificationSentAt: timestamp('notification_sent_at', { withTimezone: true }),
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),

  orgId: uuid('org_id').notNull().references(() => orgs.id),
});
