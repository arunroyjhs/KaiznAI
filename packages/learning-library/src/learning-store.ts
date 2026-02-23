import type { CreateLearningInput, LearningSearchQuery, LearningSearchResult, QualityScore } from './types.js';

export interface LearningRecord {
  id: string;
  experimentId?: string;
  outcomeId?: string;
  finding: string;
  findingType: string;
  signalEvidence?: Record<string, unknown>;
  confidence: number;
  appliesTo: string[];
  embedding?: number[];
  orgId: string;
  createdAt: Date;
}

/**
 * Persistence interface for the learning library.
 * Implementations can use Drizzle ORM / pgvector.
 */
export interface LearningStore {
  create(input: CreateLearningInput): Promise<LearningRecord>;
  findById(id: string): Promise<LearningRecord | null>;
  search(query: LearningSearchQuery): Promise<LearningSearchResult[]>;
  searchBySimilarity(embedding: number[], orgId: string, limit?: number): Promise<LearningSearchResult[]>;
  updateEmbedding(id: string, embedding: number[]): Promise<void>;
  countByExperiment(experimentId: string): Promise<number>;
  countByOutcome(outcomeId: string): Promise<number>;
}
