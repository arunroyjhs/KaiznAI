import { pgTable, uuid, text, timestamp, jsonb, numeric } from 'drizzle-orm/pg-core';
import { experiments } from './experiments.js';
import { outcomes } from './outcomes.js';
import { orgs } from './orgs.js';

export const learnings = pgTable('learnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  experimentId: uuid('experiment_id').references(() => experiments.id),
  outcomeId: uuid('outcome_id').references(() => outcomes.id),

  finding: text('finding').notNull(),
  findingType: text('finding_type').notNull(),

  signalEvidence: jsonb('signal_evidence'),
  confidence: numeric('confidence'),
  appliesTo: text('applies_to').array(),

  // pgvector embedding stored as JSONB for now, will use vector extension later
  embedding: jsonb('embedding'),

  orgId: uuid('org_id').notNull().references(() => orgs.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
