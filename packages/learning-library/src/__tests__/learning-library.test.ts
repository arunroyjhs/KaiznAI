import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LearningLibrary } from '../learning-library.js';
import type { LearningStore, LearningRecord } from '../learning-store.js';
import type { EmbeddingGenerator } from '../embedding-generator.js';
import type { CreateLearningInput, LearningSearchResult } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockStore(overrides: Partial<LearningStore> = {}): LearningStore {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    searchBySimilarity: vi.fn().mockResolvedValue([]),
    updateEmbedding: vi.fn().mockResolvedValue(undefined),
    countByExperiment: vi.fn().mockResolvedValue(0),
    countByOutcome: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function createMockEmbeddingGenerator(overrides: Partial<EmbeddingGenerator> = {}): EmbeddingGenerator {
  return {
    generate: vi.fn().mockResolvedValue(new Array(1536).fill(0.01)),
    generateBatch: vi.fn().mockResolvedValue([new Array(1536).fill(0.01)]),
    ...overrides,
  };
}

function makeCreateInput(overrides: Partial<CreateLearningInput> = {}): CreateLearningInput {
  return {
    experimentId: 'exp-1',
    outcomeId: 'out-1',
    finding: 'Users prefer dark mode',
    findingType: 'confirmed_hypothesis',
    confidence: 0.8,
    appliesTo: ['ui', 'ux'],
    orgId: 'org-1',
    ...overrides,
  };
}

function makeRecord(overrides: Partial<LearningRecord> = {}): LearningRecord {
  return {
    id: 'rec-1',
    experimentId: 'exp-1',
    outcomeId: 'out-1',
    finding: 'Users prefer dark mode',
    findingType: 'confirmed_hypothesis',
    confidence: 0.8,
    appliesTo: ['ui', 'ux'],
    orgId: 'org-1',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeSearchResult(overrides: Partial<LearningSearchResult> = {}): LearningSearchResult {
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

describe('LearningLibrary', () => {
  let store: LearningStore;
  let embeddingGenerator: EmbeddingGenerator;
  let library: LearningLibrary;

  beforeEach(() => {
    vi.restoreAllMocks();
    store = createMockStore();
    embeddingGenerator = createMockEmbeddingGenerator();
  });

  // -----------------------------------------------------------------------
  // recordLearning
  // -----------------------------------------------------------------------
  describe('recordLearning', () => {
    it('creates learning in store', async () => {
      const record = makeRecord();
      (store.create as ReturnType<typeof vi.fn>).mockResolvedValue(record);
      library = new LearningLibrary(store);

      const input = makeCreateInput();
      const result = await library.recordLearning(input);

      expect(store.create).toHaveBeenCalledWith(input);
      expect(result).toBe(record);
    });

    it('generates embedding if generator is available', async () => {
      const record = makeRecord({ id: 'rec-emb' });
      (store.create as ReturnType<typeof vi.fn>).mockResolvedValue(record);
      library = new LearningLibrary(store, embeddingGenerator);

      const input = makeCreateInput({ finding: 'Dark mode is preferred', appliesTo: ['ui'] });
      await library.recordLearning(input);

      // Should generate embedding with finding + appliesTo text
      expect(embeddingGenerator.generate).toHaveBeenCalledWith('Dark mode is preferred ui');
      // Should update embedding in store
      expect(store.updateEmbedding).toHaveBeenCalledWith('rec-emb', expect.any(Array));
    });

    it('does not generate embedding if generator is not available', async () => {
      const record = makeRecord();
      (store.create as ReturnType<typeof vi.fn>).mockResolvedValue(record);
      library = new LearningLibrary(store); // no generator

      await library.recordLearning(makeCreateInput());

      expect(store.updateEmbedding).not.toHaveBeenCalled();
    });

    it('handles embedding failure gracefully (does not throw)', async () => {
      const record = makeRecord();
      (store.create as ReturnType<typeof vi.fn>).mockResolvedValue(record);
      const failingGenerator = createMockEmbeddingGenerator({
        generate: vi.fn().mockRejectedValue(new Error('API down')),
      });
      library = new LearningLibrary(store, failingGenerator);

      // Should not throw
      const result = await library.recordLearning(makeCreateInput());

      expect(result).toBe(record);
      expect(store.updateEmbedding).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // search
  // -----------------------------------------------------------------------
  describe('search', () => {
    it('uses semantic search when embedding generator is available and query is provided', async () => {
      const semanticResults = [makeSearchResult({ id: 'sem-1' })];
      (store.searchBySimilarity as ReturnType<typeof vi.fn>).mockResolvedValue(semanticResults);
      library = new LearningLibrary(store, embeddingGenerator);

      const results = await library.search({ query: 'dark mode', orgId: 'org-1' });

      expect(embeddingGenerator.generate).toHaveBeenCalledWith('dark mode');
      expect(store.searchBySimilarity).toHaveBeenCalledWith(
        expect.any(Array),
        'org-1',
        10, // default limit
      );
      expect(results).toBe(semanticResults);
    });

    it('uses custom limit for semantic search', async () => {
      const semanticResults = [makeSearchResult()];
      (store.searchBySimilarity as ReturnType<typeof vi.fn>).mockResolvedValue(semanticResults);
      library = new LearningLibrary(store, embeddingGenerator);

      await library.search({ query: 'test', orgId: 'org-1', limit: 5 });

      expect(store.searchBySimilarity).toHaveBeenCalledWith(
        expect.any(Array),
        'org-1',
        5,
      );
    });

    it('falls back to text search on embedding failure', async () => {
      const textResults = [makeSearchResult({ id: 'txt-1' })];
      const failingGenerator = createMockEmbeddingGenerator({
        generate: vi.fn().mockRejectedValue(new Error('API down')),
      });
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(textResults);
      library = new LearningLibrary(store, failingGenerator);

      const results = await library.search({ query: 'dark mode', orgId: 'org-1' });

      expect(store.search).toHaveBeenCalledWith({ query: 'dark mode', orgId: 'org-1' });
      expect(results).toBe(textResults);
    });

    it('uses text search when no embedding generator is available', async () => {
      const textResults = [makeSearchResult({ id: 'txt-2' })];
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(textResults);
      library = new LearningLibrary(store); // no generator

      const results = await library.search({ query: 'dark mode', orgId: 'org-1' });

      expect(store.search).toHaveBeenCalledWith({ query: 'dark mode', orgId: 'org-1' });
      expect(results).toBe(textResults);
    });

    it('uses text search when query is not provided even with generator', async () => {
      const textResults = [makeSearchResult()];
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(textResults);
      library = new LearningLibrary(store, embeddingGenerator);

      const results = await library.search({ orgId: 'org-1', outcomeId: 'out-1' });

      expect(embeddingGenerator.generate).not.toHaveBeenCalled();
      expect(store.search).toHaveBeenCalledWith({ orgId: 'org-1', outcomeId: 'out-1' });
      expect(results).toBe(textResults);
    });
  });

  // -----------------------------------------------------------------------
  // getRelevantLearnings
  // -----------------------------------------------------------------------
  describe('getRelevantLearnings', () => {
    it('fetches learnings and ranks by quality', async () => {
      const learnings = [
        makeSearchResult({ id: 'a', confidence: 0.3, createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) }),
        makeSearchResult({ id: 'b', confidence: 0.9, createdAt: new Date() }),
      ];
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(learnings);
      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      library = new LearningLibrary(store);

      const results = await library.getRelevantLearnings('out-1', 'org-1', 5);

      // Should search with double the limit
      expect(store.search).toHaveBeenCalledWith({
        outcomeId: 'out-1',
        orgId: 'org-1',
        limit: 10, // 5 * 2
      });

      // Results should be ranked - higher confidence+recency first
      expect(results[0].id).toBe('b');
      expect(results[1].id).toBe('a');
    });

    it('trims results to the requested limit', async () => {
      const learnings = Array.from({ length: 6 }, (_, i) =>
        makeSearchResult({
          id: `l-${i}`,
          confidence: (i + 1) / 10,
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        }),
      );
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(learnings);
      (store.countByExperiment as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (store.countByOutcome as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      library = new LearningLibrary(store);

      const results = await library.getRelevantLearnings('out-1', 'org-1', 3);

      expect(results).toHaveLength(3);
    });

    it('uses default limit of 10', async () => {
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      library = new LearningLibrary(store);

      await library.getRelevantLearnings('out-1', 'org-1');

      expect(store.search).toHaveBeenCalledWith(expect.objectContaining({
        limit: 20, // 10 * 2
      }));
    });
  });

  // -----------------------------------------------------------------------
  // whatWeKnowAbout
  // -----------------------------------------------------------------------
  describe('whatWeKnowAbout', () => {
    it('delegates to search with topic as query', async () => {
      const results = [makeSearchResult()];
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(results);
      library = new LearningLibrary(store);

      const output = await library.whatWeKnowAbout('pricing', 'org-1', 5);

      expect(store.search).toHaveBeenCalledWith({
        query: 'pricing',
        orgId: 'org-1',
        limit: 5,
      });
      expect(output).toBe(results);
    });
  });

  // -----------------------------------------------------------------------
  // exportAsMarkdown
  // -----------------------------------------------------------------------
  describe('exportAsMarkdown', () => {
    it('returns formatted markdown for learnings', async () => {
      const learnings: LearningSearchResult[] = [
        makeSearchResult({
          id: 'l-1',
          finding: 'Dark mode improves retention',
          findingType: 'confirmed_hypothesis',
          confidence: 0.85,
          appliesTo: ['ui', 'retention'],
          createdAt: new Date('2025-06-15'),
        }),
        makeSearchResult({
          id: 'l-2',
          finding: 'Pricing page layout matters less than expected',
          findingType: 'refuted_hypothesis',
          confidence: 0.6,
          appliesTo: [],
          createdAt: new Date('2025-07-20'),
        }),
      ];
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(learnings);
      library = new LearningLibrary(store);

      const markdown = await library.exportAsMarkdown('org-1');

      expect(markdown).toContain('# Experiment Learnings');
      expect(markdown).toContain('## confirmed hypothesis [ui, retention]');
      expect(markdown).toContain('Dark mode improves retention');
      expect(markdown).toContain('**Confidence:** 85%');
      expect(markdown).toContain('**Date:** 2025-06-15');
      expect(markdown).toContain('## refuted hypothesis');
      expect(markdown).toContain('Pricing page layout matters less than expected');
      expect(markdown).toContain('**Confidence:** 60%');
    });

    it('handles empty learnings', async () => {
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      library = new LearningLibrary(store);

      const markdown = await library.exportAsMarkdown('org-1');

      expect(markdown).toBe('# Learnings\n\nNo learnings recorded yet.\n');
    });

    it('passes outcomeId filter to search when provided', async () => {
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      library = new LearningLibrary(store);

      await library.exportAsMarkdown('org-1', 'out-42');

      expect(store.search).toHaveBeenCalledWith({
        orgId: 'org-1',
        outcomeId: 'out-42',
        limit: 100,
      });
    });

    it('handles learnings with underscore finding types', async () => {
      const learnings = [
        makeSearchResult({
          findingType: 'unexpected_effect',
          finding: 'Side effect found',
          confidence: 0.5,
          appliesTo: [],
          createdAt: new Date('2025-01-01'),
        }),
      ];
      (store.search as ReturnType<typeof vi.fn>).mockResolvedValue(learnings);
      library = new LearningLibrary(store);

      const markdown = await library.exportAsMarkdown('org-1');

      // underscores replaced with spaces
      expect(markdown).toContain('## unexpected effect');
    });
  });
});
