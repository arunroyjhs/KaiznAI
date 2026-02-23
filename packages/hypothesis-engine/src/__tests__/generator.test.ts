import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HypothesisEngine } from '../generator.js';
import type { ScoredCandidate } from '../schemas.js';

// ---------------------------------------------------------------------------
// Types used for mocking (avoid importing real packages that have side effects)
// ---------------------------------------------------------------------------

interface MockLLMGateway {
  complete: ReturnType<typeof vi.fn>;
}

interface MockLearningSearchResult {
  id: string;
  finding: string;
  findingType: string;
  confidence: number;
  appliesTo: string[];
  experimentId?: string;
  outcomeId?: string;
  createdAt: Date;
  relevanceScore?: number;
}

interface MockLearningLibrary {
  getRelevantLearnings: ReturnType<typeof vi.fn>;
  whatWeKnowAbout: ReturnType<typeof vi.fn>;
}

interface MockOutcome {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: string;
  primarySignal: { source: string; metric: string; method: string; aggregation: string };
  secondarySignals: unknown[];
  target: { direction: string; from?: number; to: number; confidence_required: number };
  constraints: Array<{ signal?: string; rule?: string }>;
  maxConcurrentExperiments: number;
  horizon: string;
  owner: string;
  teamMembers: string[];
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeOutcome(overrides?: Partial<MockOutcome>): MockOutcome {
  return {
    id: 'outcome-1',
    slug: 'increase-conversion',
    title: 'Increase Checkout Conversion',
    description: 'Improve the checkout completion rate by 15%',
    status: 'active',
    primarySignal: {
      source: 'analytics',
      metric: 'checkout_conversion_rate',
      method: 'funnel',
      aggregation: '7d_rolling',
    },
    secondarySignals: [],
    target: {
      direction: 'increase',
      from: 0.32,
      to: 0.37,
      confidence_required: 0.95,
    },
    constraints: [
      { rule: 'Do not increase page load time above 3s' },
    ],
    maxConcurrentExperiments: 3,
    horizon: '90d',
    owner: 'user-1',
    teamMembers: ['user-1', 'user-2'],
    orgId: 'org-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  };
}

function makeSubProblemsResponse() {
  return {
    sub_problems: [
      {
        id: 'sp-1',
        description: 'Reduce form friction at checkout',
        metric_lever: 'form_completion_rate',
        estimated_impact: 0.08,
        evidence: '40% of users drop off at the payment form',
      },
      {
        id: 'sp-2',
        description: 'Improve trust signals on checkout page',
        metric_lever: 'trust_score',
        estimated_impact: 0.05,
        evidence: 'Users report concerns about payment security',
      },
    ],
  };
}

function makeCandidatesResponse(subProblemId: string) {
  return {
    candidates: [
      {
        title: `Experiment for ${subProblemId}`,
        hypothesis: `If we change X for ${subProblemId}, metric will improve`,
        mechanism: 'Because of better UX',
        prediction: {
          signal: 'checkout_conversion_rate',
          expected_delta: 0.04,
          delta_range: [0.01, 0.07],
          confidence: 0.7,
        },
        intervention: {
          type: 'code_change',
          scope: 'checkout',
          description: `Change related to ${subProblemId}`,
        },
        measurement_plan: {
          duration_days: 14,
          min_sample_size: 5000,
          success_threshold: 0.02,
          kill_threshold: -0.01,
        },
        rollout_plan: {
          initial_pct: 10,
          scale_to_pct: 100,
        },
        effort_hours: 6,
        risk_level: 'low',
        reversible: true,
        sub_problem_id: subProblemId,
        affected_files: [`src/${subProblemId}/component.tsx`],
      },
    ],
  };
}

function makeLLMResponse(content: string) {
  return {
    content,
    provider_used: 'anthropic',
    model_used: 'claude-opus-4',
    auth_mode_used: 'api_key',
    input_tokens: 100,
    output_tokens: 200,
    latency_ms: 500,
  };
}

function makeLearningResult(overrides?: Partial<MockLearningSearchResult>): MockLearningSearchResult {
  return {
    id: 'learning-1',
    finding: 'Simplifying forms increases conversion by 5-8%',
    findingType: 'confirmed_hypothesis',
    confidence: 0.85,
    appliesTo: ['checkout', 'forms'],
    createdAt: new Date('2025-01-10'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HypothesisEngine', () => {
  let mockGateway: MockLLMGateway;
  let mockLearningLib: MockLearningLibrary;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGateway = {
      complete: vi.fn(),
    };

    mockLearningLib = {
      getRelevantLearnings: vi.fn(),
      whatWeKnowAbout: vi.fn(),
    };
  });

  describe('generatePortfolio', () => {
    it('returns scored candidates from end-to-end pipeline', async () => {
      const outcome = makeOutcome();

      // No learning library
      const engine = new HypothesisEngine(mockGateway as any);

      // First call: decompose -> returns sub-problems
      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        // Second call: generateCandidates for sp-1
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        // Third call: generateCandidates for sp-2
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);

      expect(portfolio.length).toBeGreaterThan(0);
      expect(portfolio.length).toBeLessThanOrEqual(outcome.maxConcurrentExperiments);

      // All items should have a score property
      for (const item of portfolio) {
        expect(item).toHaveProperty('score');
        expect(typeof item.score).toBe('number');
        expect(Number.isFinite(item.score)).toBe(true);
      }
    });

    it('calls LLM gateway with correct purpose and response_format', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      // All calls should have purpose = 'hypothesis_generation' and response_format = 'json_object'
      for (const call of mockGateway.complete.mock.calls) {
        const request = call[0];
        expect(request.purpose).toBe('hypothesis_generation');
        expect(request.response_format).toBe('json_object');
      }
    });

    it('passes orgId to every LLM gateway call', async () => {
      const outcome = makeOutcome({ orgId: 'org-42' });
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      for (const call of mockGateway.complete.mock.calls) {
        expect(call[1]).toBe('org-42');
      }
    });

    it('makes 1 decompose call + N candidate calls (one per sub-problem)', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      const subProblems = makeSubProblemsResponse();
      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(subProblems)),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      // 1 (decompose) + 2 (one per sub-problem) = 3
      expect(mockGateway.complete).toHaveBeenCalledTimes(3);
    });

    it('assigns sub_problem_id to each generated candidate from the sub-problem', async () => {
      const outcome = makeOutcome({ maxConcurrentExperiments: 10 });
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);

      // Each candidate should have a sub_problem_id matching one of the sub-problems
      const validIds = new Set(['sp-1', 'sp-2']);
      for (const item of portfolio) {
        expect(validIds.has(item.sub_problem_id)).toBe(true);
      }
    });

    it('respects maxConcurrentExperiments limit', async () => {
      const outcome = makeOutcome({ maxConcurrentExperiments: 1 });
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);

      expect(portfolio).toHaveLength(1);
    });

    it('returns portfolio sorted by score descending', async () => {
      const outcome = makeOutcome({ maxConcurrentExperiments: 10 });
      const engine = new HypothesisEngine(mockGateway as any);

      // Create candidates with varying expected_delta to produce different scores
      const sp1Candidates = {
        candidates: [
          {
            ...makeCandidatesResponse('sp-1').candidates[0],
            prediction: {
              signal: 'conversion',
              expected_delta: 0.01,
              delta_range: [0.005, 0.015],
              confidence: 0.5,
            },
            affected_files: ['sp1.ts'],
          },
        ],
      };
      const sp2Candidates = {
        candidates: [
          {
            ...makeCandidatesResponse('sp-2').candidates[0],
            prediction: {
              signal: 'conversion',
              expected_delta: 0.20,
              delta_range: [0.10, 0.30],
              confidence: 0.9,
            },
            affected_files: ['sp2.ts'],
          },
        ],
      };

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(sp1Candidates)),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(sp2Candidates)),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);

      for (let i = 1; i < portfolio.length; i++) {
        expect(portfolio[i - 1].score).toBeGreaterThanOrEqual(portfolio[i].score);
      }
    });
  });

  describe('generatePortfolio with LearningLibrary', () => {
    it('fetches past learnings and passes them as context', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(
        mockGateway as any,
        mockLearningLib as any,
      );

      const learning1 = makeLearningResult({
        id: 'l-1',
        finding: 'Short forms convert better',
        findingType: 'confirmed_hypothesis',
        confidence: 0.9,
      });
      const learning2 = makeLearningResult({
        id: 'l-2',
        finding: 'Trust badges help mobile users',
        findingType: 'segment_insight',
        confidence: 0.75,
      });

      mockLearningLib.getRelevantLearnings.mockResolvedValue([learning1]);
      mockLearningLib.whatWeKnowAbout.mockResolvedValue([learning2]);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      // Verify learning library was called
      expect(mockLearningLib.getRelevantLearnings).toHaveBeenCalledWith(
        outcome.id,
        outcome.orgId,
        5,
      );
      expect(mockLearningLib.whatWeKnowAbout).toHaveBeenCalledWith(
        `${outcome.title} ${outcome.primarySignal.metric}`,
        outcome.orgId,
        5,
      );

      // Verify that the LLM calls contain learning context in the prompt
      const decompositionCall = mockGateway.complete.mock.calls[0];
      const prompt = decompositionCall[0].messages[0].content;
      expect(prompt).toContain('Short forms convert better');
      expect(prompt).toContain('Trust badges help mobile users');
    });

    it('deduplicates learnings by ID across outcome and cross-outcome queries', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(
        mockGateway as any,
        mockLearningLib as any,
      );

      // Same learning appears in both queries
      const sharedLearning = makeLearningResult({
        id: 'l-shared',
        finding: 'Shared insight',
        findingType: 'confirmed_hypothesis',
        confidence: 0.8,
      });

      mockLearningLib.getRelevantLearnings.mockResolvedValue([sharedLearning]);
      mockLearningLib.whatWeKnowAbout.mockResolvedValue([sharedLearning]);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      // The learning should appear only once in the prompt, not twice
      const decompositionCall = mockGateway.complete.mock.calls[0];
      const prompt: string = decompositionCall[0].messages[0].content;
      const occurrences = prompt.split('Shared insight').length - 1;
      expect(occurrences).toBe(1);
    });

    it('formats learnings with type and confidence', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(
        mockGateway as any,
        mockLearningLib as any,
      );

      mockLearningLib.getRelevantLearnings.mockResolvedValue([
        makeLearningResult({
          id: 'l-1',
          finding: 'Test finding',
          findingType: 'confirmed_hypothesis',
          confidence: 0.85,
        }),
      ]);
      mockLearningLib.whatWeKnowAbout.mockResolvedValue([]);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      const decompositionCall = mockGateway.complete.mock.calls[0];
      const prompt: string = decompositionCall[0].messages[0].content;
      // findingType underscores replaced with spaces, confidence as percentage
      expect(prompt).toContain('[confirmed hypothesis, 85% confidence] Test finding');
    });

    it('proceeds without learnings if learning library throws', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(
        mockGateway as any,
        mockLearningLib as any,
      );

      mockLearningLib.getRelevantLearnings.mockRejectedValue(
        new Error('Database connection failed'),
      );

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      // Should not throw
      const portfolio = await engine.generatePortfolio(outcome as any);
      expect(portfolio.length).toBeGreaterThan(0);
    });

    it('returns empty learnings when no learning library is provided', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any); // no learning lib

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);
      expect(portfolio.length).toBeGreaterThan(0);

      // The prompt should indicate no past learnings
      const decompositionCall = mockGateway.complete.mock.calls[0];
      const prompt: string = decompositionCall[0].messages[0].content;
      expect(prompt).toContain('No past learnings available yet');
    });
  });

  describe('generatePortfolio — error handling', () => {
    it('throws when LLM returns invalid JSON for decomposition', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete.mockResolvedValueOnce(
        makeLLMResponse('not valid json'),
      );

      await expect(engine.generatePortfolio(outcome as any)).rejects.toThrow();
    });

    it('throws when LLM returns JSON that does not match subProblemSchema', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      // Valid JSON but wrong shape
      mockGateway.complete.mockResolvedValueOnce(
        makeLLMResponse(JSON.stringify({ sub_problems: [{ wrong_field: true }] })),
      );

      await expect(engine.generatePortfolio(outcome as any)).rejects.toThrow();
    });

    it('throws when LLM returns invalid JSON for candidate generation', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      // Decompose succeeds
      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        // Candidate generation returns invalid JSON
        .mockResolvedValueOnce(makeLLMResponse('bad json'))
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await expect(engine.generatePortfolio(outcome as any)).rejects.toThrow();
    });

    it('throws when LLM returns candidates that do not match schema', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify({
            candidates: [{
              title: 'Missing required fields',
              // Missing all other required fields
            }],
          })),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await expect(engine.generatePortfolio(outcome as any)).rejects.toThrow();
    });
  });

  describe('generatePortfolio — decomposition prompt', () => {
    it('includes outcome title and metric in the decomposition prompt', async () => {
      const outcome = makeOutcome({
        title: 'Boost Retention',
        primarySignal: {
          source: 'analytics',
          metric: 'day_7_retention',
          method: 'event',
          aggregation: '7d_rolling',
        },
      });
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      const decompositionCall = mockGateway.complete.mock.calls[0];
      const prompt: string = decompositionCall[0].messages[0].content;
      expect(prompt).toContain('Boost Retention');
      expect(prompt).toContain('day_7_retention');
    });

    it('uses the DECOMPOSITION_SYSTEM_PROMPT as system message', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      const decompositionCall = mockGateway.complete.mock.calls[0];
      const system: string = decompositionCall[0].system;
      expect(system).toContain('decompose');
    });

    it('uses the HYPOTHESIS_GENERATION_SYSTEM_PROMPT for candidate calls', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      await engine.generatePortfolio(outcome as any);

      // Calls 1 and 2 (index 1, 2) are candidate generation
      for (let i = 1; i < mockGateway.complete.mock.calls.length; i++) {
        const system: string = mockGateway.complete.mock.calls[i][0].system;
        expect(system).toContain('experiment candidates');
      }
    });
  });

  describe('generatePortfolio — single sub-problem', () => {
    it('works with a single sub-problem', async () => {
      const outcome = makeOutcome();
      const engine = new HypothesisEngine(mockGateway as any);

      const singleSubProblem = {
        sub_problems: [
          {
            id: 'sp-only',
            description: 'Only sub-problem',
            metric_lever: 'metric',
            estimated_impact: 0.1,
            evidence: 'evidence',
          },
        ],
      };

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(singleSubProblem)),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-only'))),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);

      expect(mockGateway.complete).toHaveBeenCalledTimes(2); // 1 decompose + 1 candidate
      expect(portfolio.length).toBeGreaterThan(0);
      expect(portfolio[0].sub_problem_id).toBe('sp-only');
    });
  });

  describe('generatePortfolio — candidate scoring integration', () => {
    it('all returned candidates have valid finite scores', async () => {
      const outcome = makeOutcome({ maxConcurrentExperiments: 10 });
      const engine = new HypothesisEngine(mockGateway as any);

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeCandidatesResponse('sp-2'))),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);

      for (const candidate of portfolio) {
        expect(typeof candidate.score).toBe('number');
        expect(Number.isFinite(candidate.score)).toBe(true);
        expect(candidate.score).toBeGreaterThanOrEqual(0);
      }
    });

    it('filters out conflicting candidates from the portfolio', async () => {
      const outcome = makeOutcome({ maxConcurrentExperiments: 10 });
      const engine = new HypothesisEngine(mockGateway as any);

      // Both sub-problems produce candidates affecting the same file
      const conflictingCandidates = (spId: string) => ({
        candidates: [
          {
            ...makeCandidatesResponse(spId).candidates[0],
            affected_files: ['src/shared/checkout.ts'], // same file in both
          },
        ],
      });

      mockGateway.complete
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(makeSubProblemsResponse())),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(conflictingCandidates('sp-1'))),
        )
        .mockResolvedValueOnce(
          makeLLMResponse(JSON.stringify(conflictingCandidates('sp-2'))),
        );

      const portfolio = await engine.generatePortfolio(outcome as any);

      // Only one should be selected since they conflict
      expect(portfolio).toHaveLength(1);
    });
  });
});
