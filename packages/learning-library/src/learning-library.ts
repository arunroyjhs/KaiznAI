import type { CreateLearningInput, LearningSearchQuery, LearningSearchResult } from './types.js';
import type { LearningStore, LearningRecord } from './learning-store.js';
import type { EmbeddingGenerator } from './embedding-generator.js';
import { QualityScorer } from './quality-scorer.js';

/**
 * Main service for the Learning Library.
 * Manages creating, searching, and scoring experiment learnings.
 */
export class LearningLibrary {
  private qualityScorer: QualityScorer;

  constructor(
    private store: LearningStore,
    private embeddingGenerator?: EmbeddingGenerator,
  ) {
    this.qualityScorer = new QualityScorer(store);
  }

  /**
   * Record a new learning from an experiment.
   * Optionally generates and stores an embedding for semantic search.
   */
  async recordLearning(input: CreateLearningInput): Promise<LearningRecord> {
    const record = await this.store.create(input);

    // Generate embedding asynchronously if generator is available
    if (this.embeddingGenerator) {
      try {
        const embedding = await this.embeddingGenerator.generate(
          `${input.finding} ${input.appliesTo.join(' ')}`,
        );
        await this.store.updateEmbedding(record.id, embedding);
      } catch {
        // Embedding generation is non-critical — continue without it
      }
    }

    return record;
  }

  /**
   * Search learnings by text query, tags, or semantic similarity.
   */
  async search(query: LearningSearchQuery): Promise<LearningSearchResult[]> {
    // If we have an embedding generator and a text query, use semantic search
    if (this.embeddingGenerator && query.query) {
      try {
        const queryEmbedding = await this.embeddingGenerator.generate(query.query);
        return this.store.searchBySimilarity(
          queryEmbedding,
          query.orgId,
          query.limit ?? 10,
        );
      } catch {
        // Fall back to text search
      }
    }

    return this.store.search(query);
  }

  /**
   * Get learnings relevant to a specific outcome, ranked by quality.
   * Used by the Hypothesis Engine before generating new hypotheses.
   */
  async getRelevantLearnings(
    outcomeId: string,
    orgId: string,
    limit: number = 10,
  ): Promise<LearningSearchResult[]> {
    const learnings = await this.store.search({
      outcomeId,
      orgId,
      limit: limit * 2, // Fetch more, then rank and trim
    });

    const ranked = await this.qualityScorer.rankByQuality(learnings);
    return ranked.slice(0, limit);
  }

  /**
   * "What we know about X" — semantic query over all learnings.
   * Designed for use via MCP tool.
   */
  async whatWeKnowAbout(topic: string, orgId: string, limit: number = 10): Promise<LearningSearchResult[]> {
    return this.search({ query: topic, orgId, limit });
  }

  /**
   * Export learnings as markdown for AI context injection.
   */
  async exportAsMarkdown(orgId: string, outcomeId?: string): Promise<string> {
    const learnings = await this.store.search({
      orgId,
      outcomeId,
      limit: 100,
    });

    if (learnings.length === 0) {
      return '# Learnings\n\nNo learnings recorded yet.\n';
    }

    const lines = ['# Experiment Learnings\n'];

    for (const learning of learnings) {
      const confidence = Math.round(learning.confidence * 100);
      const tags = learning.appliesTo.length > 0 ? ` [${learning.appliesTo.join(', ')}]` : '';
      const type = learning.findingType.replace(/_/g, ' ');

      lines.push(`## ${type}${tags}`);
      lines.push('');
      lines.push(learning.finding);
      lines.push(`- **Confidence:** ${confidence}%`);
      lines.push(`- **Date:** ${learning.createdAt.toISOString().split('T')[0]}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}
