export interface CreateLearningInput {
  experimentId: string;
  outcomeId: string;
  finding: string;
  findingType: 'confirmed_hypothesis' | 'refuted_hypothesis' | 'unexpected_effect' | 'segment_insight' | 'constraint_discovered' | 'methodology_learning';
  signalEvidence?: Record<string, unknown>;
  confidence: number;
  appliesTo: string[];
  orgId: string;
}

export interface LearningSearchQuery {
  query?: string;
  outcomeId?: string;
  experimentId?: string;
  findingType?: string;
  appliesTo?: string[];
  orgId: string;
  limit?: number;
  offset?: number;
}

export interface LearningSearchResult {
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

export interface QualityScore {
  learningId: string;
  helpedFutureHypotheses: number;
  citedInExperiments: number;
  score: number;
}
