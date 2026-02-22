import { z } from 'zod';

const signalSchema = z.object({
  source: z.string(),
  metric: z.string(),
  method: z.enum(['funnel', 'event', 'custom']),
  funnel_steps: z.array(z.string()).optional(),
  segment: z.record(z.string()).optional(),
  aggregation: z.enum(['point', '7d_rolling', '30d_rolling']).default('point'),
});

const targetSchema = z.object({
  direction: z.enum(['increase', 'decrease']),
  from: z.number().optional(),
  to: z.number(),
  confidence_required: z.number().min(0).max(1).default(0.95),
});

const constraintSchema = z.object({
  signal: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  rule: z.string().optional(),
  source: z.string().optional(),
  metric: z.string().optional(),
}).refine(
  (data) => data.signal || data.rule,
  { message: 'Constraint must have either a signal or a rule' },
);

const gateConfigSchema = z.object({
  assigned_to: z.string(),
  sla: z.string(),
  channel: z.string().optional(),
});

const gatesSchema = z.object({
  portfolio_review: gateConfigSchema.optional(),
  launch_approval: gateConfigSchema.optional(),
  analysis_review: gateConfigSchema.optional(),
  scale_approval: gateConfigSchema.optional(),
  ship_approval: gateConfigSchema.optional(),
});

const scopeSchema = z.object({
  allowed_paths: z.array(z.string()).default([]),
  forbidden_paths: z.array(z.string()).default([]),
});

const portfolioSchema = z.object({
  max_concurrent: z.number().int().min(1).default(3),
});

const outcomeDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'ID must be URL-safe lowercase with hyphens'),
  title: z.string().min(1),
  description: z.string().optional(),
  signal: signalSchema,
  target: targetSchema,
  constraints: z.array(constraintSchema).default([]),
  horizon: z.string(),
  portfolio: portfolioSchema.default({ max_concurrent: 3 }),
  gates: gatesSchema.default({}),
  scope: scopeSchema.default({ allowed_paths: [], forbidden_paths: [] }),
  llm_provider: z.string().optional(),
});

const llmConfigSchema = z.object({
  default_provider: z.string(),
  hypothesis_model: z.string().optional(),
  analysis_model: z.string().optional(),
});

const signalConnectorSchema = z.object({
  name: z.string(),
  type: z.string(),
  config: z.record(z.string()).default({}),
});

const featureFlagsSchema = z.object({
  provider: z.string(),
  config: z.record(z.string()).default({}),
});

const notificationsSchema = z.object({
  slack: z.object({
    bot_token: z.string(),
    default_channel: z.string(),
  }).optional(),
  email: z.object({
    smtp_host: z.string(),
    smtp_port: z.number(),
    from: z.string(),
  }).optional(),
});

export const outcomeYamlSchema = z.object({
  version: z.number().int().default(1),
  outcomes: z.array(outcomeDefinitionSchema).min(1),
  llm: llmConfigSchema.optional(),
  signal_connectors: z.array(signalConnectorSchema).default([]),
  feature_flags: featureFlagsSchema.optional(),
  notifications: notificationsSchema.optional(),
});

export type OutcomeYamlConfig = z.infer<typeof outcomeYamlSchema>;
export type OutcomeDefinition = z.infer<typeof outcomeDefinitionSchema>;
