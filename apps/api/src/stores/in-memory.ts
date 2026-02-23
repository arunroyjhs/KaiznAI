/**
 * In-memory store implementations for development.
 * These will be replaced with real database stores (Drizzle + PostgreSQL) in production.
 */

import type { AgentRegistration, AgentAction, AgentHeartbeat, AgentRuntime } from '@outcome-runtime/core';
import type { AgentRegistryStore } from '@outcome-runtime/agent-sdk';
import type { Gate, GateStore } from '@outcome-runtime/human-gates';
import type { SubscriptionStore, Subscription } from '@outcome-runtime/billing';

// ---------------------------------------------------------------------------
// AgentRegistryStore (in-memory)
// ---------------------------------------------------------------------------

export class InMemoryAgentRegistryStore implements AgentRegistryStore {
  private agents = new Map<string, AgentRegistration>();
  private actions: AgentAction[] = [];

  async register(
    agent: Omit<AgentRegistration, 'id' | 'connectedAt' | 'lastHeartbeat'>,
  ): Promise<AgentRegistration> {
    const now = new Date();
    const record: AgentRegistration = {
      ...agent,
      id: crypto.randomUUID(),
      connectedAt: now,
      lastHeartbeat: now,
    };
    this.agents.set(record.id, record);
    return record;
  }

  async unregister(agentId: string): Promise<void> {
    this.agents.delete(agentId);
  }

  async updateHeartbeat(heartbeat: AgentHeartbeat): Promise<void> {
    const agent = this.agents.get(heartbeat.agentId);
    if (agent) {
      agent.status = heartbeat.status;
      agent.lastHeartbeat = new Date();
      if (heartbeat.currentExperimentId !== undefined) {
        agent.currentExperimentId = heartbeat.currentExperimentId;
      }
    }
  }

  async getAgent(agentId: string): Promise<AgentRegistration | null> {
    return this.agents.get(agentId) ?? null;
  }

  async getActiveAgents(orgId: string): Promise<AgentRegistration[]> {
    return Array.from(this.agents.values()).filter((a) => a.orgId === orgId);
  }

  async getAgentForExperiment(experimentId: string): Promise<AgentRegistration | null> {
    return (
      Array.from(this.agents.values()).find((a) => a.currentExperimentId === experimentId) ?? null
    );
  }

  async logAction(action: Omit<AgentAction, 'id' | 'timestamp'>): Promise<AgentAction> {
    const record: AgentAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    this.actions.push(record);
    return record;
  }

  async getActionsForExperiment(experimentId: string): Promise<AgentAction[]> {
    return this.actions.filter((a) => a.experimentId === experimentId);
  }
}

// ---------------------------------------------------------------------------
// GateStore (in-memory)
// ---------------------------------------------------------------------------

export class InMemoryGateStore implements GateStore {
  private gates = new Map<string, Gate>();

  async create(gate: Omit<Gate, 'id'>): Promise<Gate> {
    const record: Gate = { ...gate, id: crypto.randomUUID() };
    this.gates.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<Gate | null> {
    return this.gates.get(id) ?? null;
  }

  async findPendingByAssignee(assignedTo: string, orgId: string): Promise<Gate[]> {
    return Array.from(this.gates.values()).filter(
      (g) => g.assignedTo === assignedTo && g.orgId === orgId && g.status === 'pending',
    );
  }

  async update(id: string, updates: Partial<Gate>): Promise<Gate> {
    const gate = this.gates.get(id);
    if (!gate) throw new Error(`Gate ${id} not found`);
    const updated = { ...gate, ...updates };
    this.gates.set(id, updated);
    return updated;
  }
}

// ---------------------------------------------------------------------------
// LearningStore (in-memory)
// ---------------------------------------------------------------------------

interface LearningRecord {
  id: string;
  experimentId: string;
  outcomeId: string;
  finding: string;
  findingType: string;
  signalEvidence?: Record<string, unknown>;
  confidence: number;
  appliesTo: string[];
  embedding?: number[];
  orgId: string;
  createdAt: Date;
}

interface CreateLearningInput {
  experimentId: string;
  outcomeId: string;
  finding: string;
  findingType: string;
  signalEvidence?: Record<string, unknown>;
  confidence: number;
  appliesTo: string[];
  orgId: string;
}

interface LearningSearchQuery {
  query?: string;
  outcomeId?: string;
  experimentId?: string;
  findingType?: string;
  appliesTo?: string[];
  orgId: string;
  limit?: number;
  offset?: number;
}

interface LearningSearchResult {
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

export class InMemoryLearningStore {
  private records = new Map<string, LearningRecord>();

  async create(input: CreateLearningInput): Promise<LearningRecord> {
    const record: LearningRecord = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<LearningRecord | null> {
    return this.records.get(id) ?? null;
  }

  async search(query: LearningSearchQuery): Promise<LearningSearchResult[]> {
    let results = Array.from(this.records.values()).filter((r) => r.orgId === query.orgId);

    if (query.outcomeId) {
      results = results.filter((r) => r.outcomeId === query.outcomeId);
    }
    if (query.experimentId) {
      results = results.filter((r) => r.experimentId === query.experimentId);
    }
    if (query.findingType) {
      results = results.filter((r) => r.findingType === query.findingType);
    }
    if (query.query) {
      const q = query.query.toLowerCase();
      results = results.filter(
        (r) => r.finding.toLowerCase().includes(q) || r.appliesTo.some((t) => t.toLowerCase().includes(q)),
      );
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 10;

    return results.slice(offset, offset + limit).map((r) => ({
      id: r.id,
      finding: r.finding,
      findingType: r.findingType,
      confidence: r.confidence,
      appliesTo: r.appliesTo,
      experimentId: r.experimentId,
      outcomeId: r.outcomeId,
      createdAt: r.createdAt,
    }));
  }

  async searchBySimilarity(
    _embedding: number[],
    orgId: string,
    limit: number = 10,
  ): Promise<LearningSearchResult[]> {
    // In-memory: fall back to returning recent records for the org
    return this.search({ orgId, limit });
  }

  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.embedding = embedding;
    }
  }

  async countByExperiment(experimentId: string): Promise<number> {
    return Array.from(this.records.values()).filter((r) => r.experimentId === experimentId).length;
  }

  async countByOutcome(outcomeId: string): Promise<number> {
    return Array.from(this.records.values()).filter((r) => r.outcomeId === outcomeId).length;
  }
}

// ---------------------------------------------------------------------------
// SubscriptionStore (in-memory)
// ---------------------------------------------------------------------------

export class InMemorySubscriptionStore implements SubscriptionStore {
  private subscriptions = new Map<string, Subscription>();

  async getByOrgId(orgId: string): Promise<Subscription | null> {
    return (
      Array.from(this.subscriptions.values()).find((s) => s.orgId === orgId) ?? null
    );
  }

  async upsert(subscription: Omit<Subscription, 'id'>): Promise<Subscription> {
    const existing = await this.getByOrgId(subscription.orgId);
    if (existing) {
      const updated = { ...existing, ...subscription };
      this.subscriptions.set(existing.id, updated);
      return updated;
    }

    const record: Subscription = {
      ...subscription,
      id: crypto.randomUUID(),
    };
    this.subscriptions.set(record.id, record);
    return record;
  }

  async updateStatus(
    stripeSubscriptionId: string,
    status: Subscription['status'],
    currentPeriodEnd: Date,
  ): Promise<void> {
    for (const sub of this.subscriptions.values()) {
      if (sub.stripeSubscriptionId === stripeSubscriptionId) {
        sub.status = status;
        sub.currentPeriodEnd = currentPeriodEnd;
        return;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Generic data stores (outcomes, experiments, workspaces, providers, signals)
// These are simple CRUD maps for entities that don't have package interfaces.
// ---------------------------------------------------------------------------

export interface OutcomeRecord {
  id: string;
  slug: string;
  title: string;
  description?: string;
  primarySignal: Record<string, unknown>;
  target: Record<string, unknown>;
  constraints: Record<string, unknown>[];
  secondarySignals: Record<string, unknown>[];
  maxConcurrentExperiments: number;
  horizon: string;
  owner: string;
  teamMembers: string[];
  orgId: string;
  workspaceId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class InMemoryOutcomeStore {
  private outcomes = new Map<string, OutcomeRecord>();

  create(outcome: OutcomeRecord): OutcomeRecord {
    this.outcomes.set(outcome.id, outcome);
    return outcome;
  }

  findById(id: string): OutcomeRecord | null {
    return this.outcomes.get(id) ?? null;
  }

  findByOrgId(orgId: string, page: number, limit: number): { data: OutcomeRecord[]; total: number } {
    const all = Array.from(this.outcomes.values()).filter((o) => o.orgId === orgId);
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), total: all.length };
  }

  update(id: string, updates: Partial<OutcomeRecord>): OutcomeRecord | null {
    const outcome = this.outcomes.get(id);
    if (!outcome) return null;
    const updated = { ...outcome, ...updates, updatedAt: new Date().toISOString() };
    this.outcomes.set(id, updated);
    return updated;
  }

  getExperimentsByOutcomeId(_outcomeId: string): unknown[] {
    // Cross-reference with experiment store would happen here
    return [];
  }
}

export interface ExperimentRecord {
  id: string;
  outcomeId?: string;
  hypothesis: string;
  status: string;
  brief?: Record<string, unknown>;
  buildReport?: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  orgId: string;
}

export class InMemoryExperimentStore {
  private experiments = new Map<string, ExperimentRecord>();

  create(experiment: ExperimentRecord): ExperimentRecord {
    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  findById(id: string): ExperimentRecord | null {
    return this.experiments.get(id) ?? null;
  }

  findByOutcomeId(outcomeId: string): ExperimentRecord[] {
    return Array.from(this.experiments.values()).filter((e) => e.outcomeId === outcomeId);
  }

  update(id: string, updates: Partial<ExperimentRecord>): ExperimentRecord | null {
    const experiment = this.experiments.get(id);
    if (!experiment) return null;
    const updated = { ...experiment, ...updates, updatedAt: new Date().toISOString() };
    this.experiments.set(id, updated);
    return updated;
  }
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  orgId: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRecord {
  id: string;
  email: string;
  name?: string;
  role: string;
  orgId: string;
  workspaceId?: string;
  status: 'active' | 'invited';
  invitedAt?: string;
}

export class InMemoryWorkspaceStore {
  private workspaces = new Map<string, WorkspaceRecord>();
  private members = new Map<string, MemberRecord>();

  setWorkspace(workspace: WorkspaceRecord): WorkspaceRecord {
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  getWorkspaceByOrgId(orgId: string): WorkspaceRecord | null {
    return Array.from(this.workspaces.values()).find((w) => w.orgId === orgId) ?? null;
  }

  updateWorkspace(orgId: string, updates: Partial<WorkspaceRecord>): WorkspaceRecord | null {
    const workspace = this.getWorkspaceByOrgId(orgId);
    if (!workspace) return null;
    const updated = { ...workspace, ...updates, updatedAt: new Date().toISOString() };
    this.workspaces.set(workspace.id, updated);
    return updated;
  }

  getMembers(orgId: string): MemberRecord[] {
    return Array.from(this.members.values()).filter((m) => m.orgId === orgId);
  }

  addMember(member: MemberRecord): MemberRecord {
    this.members.set(member.id, member);
    return member;
  }
}

export interface ProviderRecord {
  id: string;
  provider: string;
  auth_mode: string;
  api_key?: string;
  preferred_model?: string;
  fallback_model?: string;
  org_id: string;
  is_active: boolean;
  createdAt: string;
}

export class InMemoryProviderStore {
  private providers = new Map<string, ProviderRecord>();

  create(provider: ProviderRecord): ProviderRecord {
    this.providers.set(provider.id, provider);
    return provider;
  }

  findByOrgId(orgId: string): ProviderRecord[] {
    return Array.from(this.providers.values()).filter((p) => p.org_id === orgId && p.is_active);
  }

  findById(id: string): ProviderRecord | null {
    return this.providers.get(id) ?? null;
  }

  update(id: string, updates: Partial<ProviderRecord>): ProviderRecord | null {
    const provider = this.providers.get(id);
    if (!provider) return null;
    const updated = { ...provider, ...updates };
    this.providers.set(id, updated);
    return updated;
  }

  softDelete(id: string): boolean {
    const provider = this.providers.get(id);
    if (!provider) return false;
    provider.is_active = false;
    return true;
  }
}

export interface SignalMeasurement {
  id: string;
  outcome_id: string;
  experiment_id?: string;
  signal_name: string;
  variant?: string;
  value: number;
  sample_size?: number;
  segment?: Record<string, string>;
  source: string;
  timestamp: string;
}

export class InMemorySignalStore {
  private measurements: SignalMeasurement[] = [];

  ingest(measurement: SignalMeasurement): SignalMeasurement {
    this.measurements.push(measurement);
    return measurement;
  }

  findByOutcomeId(outcomeId: string): SignalMeasurement[] {
    return this.measurements.filter((m) => m.outcome_id === outcomeId);
  }

  findByExperimentId(experimentId: string): SignalMeasurement[] {
    return this.measurements.filter((m) => m.experiment_id === experimentId);
  }
}
