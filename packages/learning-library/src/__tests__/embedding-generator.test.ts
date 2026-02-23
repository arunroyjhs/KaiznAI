import { describe, it, expect } from 'vitest';
import { SimpleEmbeddingGenerator } from '../embedding-generator.js';

describe('SimpleEmbeddingGenerator', () => {
  const generator = new SimpleEmbeddingGenerator();

  // -----------------------------------------------------------------------
  // generate
  // -----------------------------------------------------------------------
  describe('generate', () => {
    it('returns an array of 1536 numbers', async () => {
      const embedding = await generator.generate('hello world');

      expect(embedding).toHaveLength(1536);
      expect(embedding.every((v) => typeof v === 'number')).toBe(true);
    });

    it('returns a normalized vector (magnitude approximately 1)', async () => {
      const embedding = await generator.generate('test embedding normalization');

      const magnitude = Math.sqrt(
        embedding.reduce((sum, v) => sum + v * v, 0),
      );

      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('produces different vectors for different text inputs', async () => {
      const embedding1 = await generator.generate('the quick brown fox');
      const embedding2 = await generator.generate('machine learning algorithms');

      // Vectors should not be identical
      const areDifferent = embedding1.some((v, i) => v !== embedding2[i]);
      expect(areDifferent).toBe(true);
    });

    it('produces the same vector for the same text (deterministic)', async () => {
      const embedding1 = await generator.generate('deterministic test');
      const embedding2 = await generator.generate('deterministic test');

      expect(embedding1).toEqual(embedding2);
    });

    it('handles single-word input', async () => {
      const embedding = await generator.generate('hello');

      expect(embedding).toHaveLength(1536);
      const magnitude = Math.sqrt(
        embedding.reduce((sum, v) => sum + v * v, 0),
      );
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('handles empty string input', async () => {
      const embedding = await generator.generate('');

      expect(embedding).toHaveLength(1536);
      // Empty string splits into [''] which has a hash, so magnitude should still be ~1
      // or all zeros if no valid words
    });
  });

  // -----------------------------------------------------------------------
  // generateBatch
  // -----------------------------------------------------------------------
  describe('generateBatch', () => {
    it('returns correct number of embeddings for batch input', async () => {
      const texts = ['hello world', 'foo bar', 'test embedding'];
      const embeddings = await generator.generateBatch(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach((embedding) => {
        expect(embedding).toHaveLength(1536);
      });
    });

    it('each embedding in batch is normalized', async () => {
      const texts = ['alpha beta', 'gamma delta'];
      const embeddings = await generator.generateBatch(texts);

      for (const embedding of embeddings) {
        const magnitude = Math.sqrt(
          embedding.reduce((sum, v) => sum + v * v, 0),
        );
        expect(magnitude).toBeCloseTo(1.0, 5);
      }
    });

    it('batch results match individual generation results', async () => {
      const texts = ['first text', 'second text'];

      const batchResults = await generator.generateBatch(texts);
      const individual1 = await generator.generate('first text');
      const individual2 = await generator.generate('second text');

      expect(batchResults[0]).toEqual(individual1);
      expect(batchResults[1]).toEqual(individual2);
    });

    it('returns empty array for empty batch', async () => {
      const embeddings = await generator.generateBatch([]);

      expect(embeddings).toEqual([]);
    });

    it('handles single-item batch', async () => {
      const embeddings = await generator.generateBatch(['only one']);

      expect(embeddings).toHaveLength(1);
      expect(embeddings[0]).toHaveLength(1536);
    });
  });
});
