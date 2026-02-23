import { pgTable, uuid, text, timestamp, jsonb, numeric } from 'drizzle-orm/pg-core';
import { outcomes } from './outcomes.js';
import { orgs } from './orgs.js';

export const experiments = pgTable('experiments', {
  id: uuid('id').primaryKey().defaultRandom(),
  outcomeId: uuid('outcome_id').notNull().references(() => outcomes.id),

  title: text('title').notNull(),

  hypothesis: text('hypothesis').notNull(),
  mechanism: text('mechanism').notNull(),
  prediction: jsonb('prediction').notNull(),
  intervention: jsonb('intervention').notNull(),
  measurementPlan: jsonb('measurement_plan').notNull(),
  rolloutPlan: jsonb('rollout_plan').notNull(),

  baselineValue: numeric('baseline_value'),
  baselineCapturedAt: timestamp('baseline_captured_at', { withTimezone: true }),

  generatedBy: text('generated_by').notNull(),
  agentId: text('agent_id'),
  agentRuntime: text('agent_runtime'),
  featureFlagKey: text('feature_flag_key'),

  status: text('status').notNull().default('hypothesis'),

  currentResult: jsonb('current_result'),
  finalResult: jsonb('final_result'),
  learnings: text('learnings'),

  orgId: uuid('org_id').notNull().references(() => orgs.id),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  launchedAt: timestamp('launched_at', { withTimezone: true }),
  concludedAt: timestamp('concluded_at', { withTimezone: true }),
});
