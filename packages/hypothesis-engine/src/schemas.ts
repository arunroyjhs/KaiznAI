import { z } from 'zod';

export const subProblemSchema = z.object({
  id: z.string(),
  description: z.string(),
  metric_lever: z.string(),
  estimated_impact: z.number(),
  evidence: z.string(),
});

export type SubProblem = z.infer<typeof subProblemSchema>;

export const experimentCandidateSchema = z.object({
  title: z.string(),
  hypothesis: z.string(),
  mechanism: z.string(),
  prediction: z.object({
    signal: z.string(),
    expected_delta: z.number(),
    delta_range: z.tuple([z.number(), z.number()]),
    confidence: z.number().min(0).max(1),
  }),
  intervention: z.object({
    type: z.enum(['code_change', 'config_change', 'copy_change']),
    scope: z.string(),
    description: z.string(),
    feature_flag: z.string().optional(),
  }),
  measurement_plan: z.object({
    duration_days: z.number().int().min(1),
    min_sample_size: z.number().int().min(100),
    success_threshold: z.number(),
    kill_threshold: z.number(),
    segments: z.array(z.string()).optional(),
  }),
  rollout_plan: z.object({
    initial_pct: z.number().min(0).max(100),
    scale_to_pct: z.number().min(0).max(100),
    scale_trigger: z.string().optional(),
  }),
  effort_hours: z.number(),
  risk_level: z.enum(['low', 'medium', 'high']),
  reversible: z.boolean(),
  sub_problem_id: z.string(),
  affected_files: z.array(z.string()).optional(),
});

export type ExperimentCandidate = z.infer<typeof experimentCandidateSchema>;

export interface ScoredCandidate extends ExperimentCandidate {
  score: number;
}
