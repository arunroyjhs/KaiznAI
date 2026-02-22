import { pgTable, uuid, text, timestamp, jsonb, numeric, integer } from 'drizzle-orm/pg-core';
import { outcomes } from './outcomes.js';
import { experiments } from './experiments.js';
import { orgs } from './orgs.js';

export const signalMeasurements = pgTable('signal_measurements', {
  time: timestamp('time', { withTimezone: true }).notNull(),
  outcomeId: uuid('outcome_id').references(() => outcomes.id),
  experimentId: uuid('experiment_id').references(() => experiments.id),
  signalName: text('signal_name').notNull(),
  variant: text('variant'),
  value: numeric('value').notNull(),
  sampleSize: integer('sample_size'),
  segment: jsonb('segment'),
  source: text('source').notNull(),
  rawResponse: jsonb('raw_response'),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
});
