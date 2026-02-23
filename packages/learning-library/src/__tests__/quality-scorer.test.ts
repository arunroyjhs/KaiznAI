import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityScorer } from '../quality-scorer.js';
import type { LearningStore } from '../learning-store.js';
import type { LearningSearchResult } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockStore(overrides: Partial<LearningStore> = {}): LearningStore {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    search: vi.fn(),
    searchBySimilarity: vi.fn(),
    updateEmbedding: vi.fn(),
    countByExperiment: vi.fn().mockResolvedValue(0),
    countByOutcome: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makeLearning(overrides: Partial<LearningSearchResult> = {}): LearningSearchResult {
  return {
    id: 'learn-1',
    finding: 'Users prefer dark mode',
    findingType: 'confirmed_hypothesis',
    confidence: 0.8,
    appliesTo: ['ui', 'ux'],
    experimentId: 'exp-1',
    outcomeId: 'out-1',
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QualityScorer', () => {
  let store: LearningStore;
  let scorer: QualityScorer;

  beforeEach(() => {
    vi.restoreAllMocks();
    store = createMockStore();
    scorer = new QualityScorer(store);
  });

  // -----------------------------------------------------------------------
  // score
  // -----------------------------------------------------------------------
  describe('score', () => {
    it('high confidence, recent, well-cited learning gets a high score', async () => {
      // confidence: 0.9 * 0.3 = 0.27
      // experimentCount: 3 => min(3*0.1, 0.3) = 0.3
      // outcomeCount: 2 => crossOutcome = 0.2
      // createdAt: today => recency = 0.2
      // total = 0.27 + 0.3 + 0.2 + 0.2 = 0.97
      const learning = makeLearning({
        confidence: 0.9,
        experimentId: 'exp-1',
        outcomeId: 'out-1',
        createdAt: new Date(), // today
      });

      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(3);
      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      const result = await scorer.score(learning);

      expect(result.score).toBeCloseTo(0.97, 2);
      expect(result.learningId).toBe('learn-1');
      expect(result.citedInExperiments).toBe(3);
      expect(result.helpedFutureHypotheses).toBe(2);
    });

    it('old, low confidence, uncited learning gets a low score', async () => {
      // confidence: 0.2 * 0.3 = 0.06
      // experimentCount: 0 => citationValue = 0
      // outcomeCount: 0 => crossOutcome = 0
      // createdAt: 120 days ago => recency = 0
      // total = 0.06
      const learning = makeLearning({
        confidence: 0.2,
        experimentId: undefined,
        outcomeId: undefined,
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      });

      const result = await scorer.score(learning);

      expect(result.score).toBeCloseTo(0.06, 2);
    });

    it('recency bonus: <30 days gives 0.2', async () => {
      const learning = makeLearning({
        confidence: 0,
        experimentId: undefined,
        outcomeId: undefined,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      });

      const result = await scorer.score(learning);

      // Only recency contributes: 0 + 0 + 0 + 0.2 = 0.2
      expect(result.score).toBeCloseTo(0.2, 2);
    });

    it('recency bonus: <90 days (but >=30) gives 0.1', async () => {
      const learning = makeLearning({
        confidence: 0,
        experimentId: undefined,
        outcomeId: undefined,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      });

      const result = await scorer.score(learning);

      // Only recency contributes: 0 + 0 + 0 + 0.1 = 0.1
      expect(result.score).toBeCloseTo(0.1, 2);
    });

    it('recency bonus: >=90 days gives 0', async () => {
      const learning = makeLearning({
        confidence: 0,
        experimentId: undefined,
        outcomeId: undefined,
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      });

      const result = await scorer.score(learning);

      expect(result.score).toBe(0);
    });

    it('score is capped at 1.0', async () => {
      // confidence: 1.0 * 0.3 = 0.3
      // experimentCount: 10 => min(10*0.1, 0.3) = 0.3
      // outcomeCount: 5 => crossOutcome = 0.2
      // createdAt: today => recency = 0.2
      // raw total = 0.3 + 0.3 + 0.2 + 0.2 = 1.0 (exactly)
      const learning = makeLearning({
        confidence: 1.0,
        createdAt: new Date(),
      });

      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(10);
      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await scorer.score(learning);

      expect(result.score).toBeLessThanOrEqual(1.0);
      expect(result.score).toBe(1.0);
    });

    it('score does not exceed 1.0 even with extreme inputs', async () => {
      const learning = makeLearning({
        confidence: 1.0,
        createdAt: new Date(),
      });

      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(100);
      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(50);

      const result = await scorer.score(learning);

      expect(result.score).toBeLessThanOrEqual(1.0);
    });

    it('citation value is capped at 0.3', async () => {
      // experimentCount: 5 => 5*0.1 = 0.5, but capped at 0.3
      const learning = makeLearning({
        confidence: 0,
        experimentId: 'exp-many',
        outcomeId: undefined,
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      });

      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await scorer.score(learning);

      // Only citationValue contributes: capped at 0.3
      expect(result.score).toBeCloseTo(0.3, 2);
    });

    it('cross-outcome value is 0.2 when outcomeCount > 1', async () => {
      const learning = makeLearning({
        confidence: 0,
        experimentId: undefined,
        outcomeId: 'out-1',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      });

      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      const result = await scorer.score(learning);

      expect(result.score).toBeCloseTo(0.2, 2);
    });

    it('cross-outcome value is 0 when outcomeCount is 1', async () => {
      const learning = makeLearning({
        confidence: 0,
        experimentId: undefined,
        outcomeId: 'out-1',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      });

      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await scorer.score(learning);

      expect(result.score).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // rankByQuality
  // -----------------------------------------------------------------------
  describe('rankByQuality', () => {
    it('sorts learnings by score descending', async () => {
      const learningHigh = makeLearning({
        id: 'high',
        confidence: 1.0,
        createdAt: new Date(),
      });
      const learningMed = makeLearning({
        id: 'med',
        confidence: 0.5,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
      const learningLow = makeLearning({
        id: 'low',
        confidence: 0.1,
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      });

      // All have zero experiments/outcomes
      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const ranked = await scorer.rankByQuality([learningLow, learningHigh, learningMed]);

      expect(ranked[0].id).toBe('high');
      expect(ranked[1].id).toBe('med');
      expect(ranked[2].id).toBe('low');
      expect(ranked[0].qualityScore).toBeGreaterThan(ranked[1].qualityScore);
      expect(ranked[1].qualityScore).toBeGreaterThan(ranked[2].qualityScore);
    });

    it('returns empty array for empty input', async () => {
      const ranked = await scorer.rankByQuality([]);

      expect(ranked).toEqual([]);
    });

    it('includes qualityScore property on each result', async () => {
      const learning = makeLearning({ id: 'only' });

      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const ranked = await scorer.rankByQuality([learning]);

      expect(ranked).toHaveLength(1);
      expect(ranked[0]).toHaveProperty('qualityScore');
      expect(typeof ranked[0].qualityScore).toBe('number');
    });
  });
});
