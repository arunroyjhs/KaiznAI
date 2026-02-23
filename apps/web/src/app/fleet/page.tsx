'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agent {
  id: string;
  runtime: 'claude-code' | 'cursor' | 'windsurf' | 'devin' | 'custom-rest';
  name: string;
  version?: string;
  capabilities: string[];
  status: 'idle' | 'building' | 'testing' | 'error' | 'disconnected';
  currentExperimentId?: string;
  currentExperimentTitle?: string;
  progress?: number;
  lastHeartbeat: Date;
}

interface Conflict {
  id: string;
  type: string;
  severity: 'warning' | 'critical';
  experimentIds: string[];
  agentIds: string[];
  description: string;
  affectedPaths: string[];
  resolved: boolean;
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const DEMO_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    runtime: 'claude-code',
    name: 'Claude Code (VS Code)',
    version: '1.2.0',
    capabilities: ['code_change', 'test_writing', 'refactoring'],
    status: 'building',
    currentExperimentId: 'exp-1',
    currentExperimentTitle: 'Simplified mobile checkout form',
    progress: 67,
    lastHeartbeat: new Date(Date.now() - 15_000),
  },
  {
    id: 'agent-2',
    runtime: 'cursor',
    name: 'Cursor Agent',
    version: '0.42.0',
    capabilities: ['code_change', 'config_change'],
    status: 'idle',
    lastHeartbeat: new Date(Date.now() - 45_000),
  },
  {
    id: 'agent-3',
    runtime: 'devin',
    name: 'Devin',
    version: '2.0.1',
    capabilities: ['code_change', 'test_writing', 'deployment'],
    status: 'testing',
    currentExperimentId: 'exp-2',
    currentExperimentTitle: 'Guest checkout option',
    progress: 92,
    lastHeartbeat: new Date(Date.now() - 8_000),
  },
  {
    id: 'agent-4',
    runtime: 'windsurf',
    name: 'Windsurf Cascade',
    capabilities: ['code_change'],
    status: 'disconnected',
    lastHeartbeat: new Date(Date.now() - 300_000),
  },
];

const DEMO_CONFLICTS: Conflict[] = [
  {
    id: 'conflict-1',
    type: 'file_overlap',
    severity: 'warning',
    experimentIds: ['exp-1', 'exp-2'],
    agentIds: ['agent-1', 'agent-3'],
    description:
      'Both experiments modify src/components/checkout/CheckoutForm.tsx',
    affectedPaths: [
      'src/components/checkout/CheckoutForm.tsx',
      'src/components/checkout/PaymentStep.tsx',
    ],
    resolved: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

const RUNTIME_COLORS: Record<string, { bg: string; text: string }> = {
  'claude-code': { bg: 'bg-accent-primary/15', text: 'text-accent-primary' },
  cursor: { bg: 'bg-signal-positive/15', text: 'text-signal-positive' },
  windsurf: { bg: 'bg-signal-warning/15', text: 'text-signal-warning' },
  devin: { bg: 'bg-accent-secondary/15', text: 'text-accent-secondary' },
  'custom-rest': { bg: 'bg-text-muted/15', text: 'text-text-secondary' },
};

const STATUS_CONFIG: Record<
  Agent['status'],
  { dot: string; label: string; strike?: boolean; pulse?: boolean }
> = {
  idle: { dot: 'bg-zinc-500', label: 'Idle' },
  building: { dot: 'bg-accent-primary', label: 'Building', pulse: true },
  testing: { dot: 'bg-signal-warning', label: 'Testing', pulse: true },
  error: { dot: 'bg-signal-negative', label: 'Error' },
  disconnected: { dot: 'bg-zinc-600', label: 'Disconnected', strike: true },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const runtime = (RUNTIME_COLORS[agent.runtime] ?? RUNTIME_COLORS['custom-rest'])!;
  const status = STATUS_CONFIG[agent.status];

  return (
    <div className="bg-surface rounded-lg border border-border p-5 flex flex-col gap-3">
      {/* Top row: name + runtime badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className={`text-sm font-medium truncate ${
              status.strike
                ? 'text-text-muted line-through'
                : 'text-text-primary'
            }`}
          >
            {agent.name}
          </h3>
          {agent.version && (
            <span className="text-[10px] text-text-muted">v{agent.version}</span>
          )}
        </div>
        <span
          className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded ${runtime.bg} ${runtime.text}`}
        >
          {agent.runtime}
        </span>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {status.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.dot}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${status.dot}`}
          />
        </span>
        <span className="text-xs text-text-secondary">{status.label}</span>
        <span className="text-[10px] text-text-muted ml-auto">
          {relativeTime(agent.lastHeartbeat)}
        </span>
      </div>

      {/* Current experiment */}
      {agent.currentExperimentTitle && (
        <div className="bg-surface-elevated rounded px-3 py-2">
          <p className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">
            Current Experiment
          </p>
          <p className="text-xs text-text-primary truncate">
            {agent.currentExperimentTitle}
          </p>
        </div>
      )}

      {/* Progress bar */}
      {agent.progress !== undefined &&
        (agent.status === 'building' || agent.status === 'testing') && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted">Progress</span>
              <span className="text-[10px] font-mono text-text-secondary">
                {agent.progress}%
              </span>
            </div>
            <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  agent.status === 'testing'
                    ? 'bg-signal-warning'
                    : 'bg-accent-primary'
                }`}
                style={{ width: `${agent.progress}%` }}
              />
            </div>
          </div>
        )}

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
        {agent.capabilities.map((cap) => (
          <span
            key={cap}
            className="text-[10px] px-2 py-0.5 bg-surface-elevated border border-border rounded text-text-muted"
          >
            {cap}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConflictCard({
  conflict,
  agents,
}: {
  conflict: Conflict;
  agents: Agent[];
}) {
  const severityStyle =
    conflict.severity === 'critical'
      ? { border: 'border-signal-negative/40', badge: 'bg-signal-negative/10 text-signal-negative' }
      : { border: 'border-signal-warning/40', badge: 'bg-signal-warning/10 text-signal-warning' };

  const affectedAgentNames = conflict.agentIds
    .map((id) => agents.find((a) => a.id === id)?.name ?? id)
    .join(', ');

  return (
    <div
      className={`bg-surface rounded-lg border ${severityStyle.border} p-5`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded ${severityStyle.badge}`}
          >
            {conflict.severity}
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-wide">
            {conflict.type.replace('_', ' ')}
          </span>
        </div>
        <button className="text-xs px-3 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors">
          Resolve
        </button>
      </div>

      <p className="text-sm text-text-primary mb-3">{conflict.description}</p>

      <div className="flex flex-col gap-2">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">
            Affected Agents
          </p>
          <p className="text-xs text-text-secondary">{affectedAgentNames}</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">
            Affected Paths
          </p>
          <div className="flex flex-col gap-1">
            {conflict.affectedPaths.map((path) => (
              <code
                key={path}
                className="text-[10px] font-mono text-text-secondary bg-surface-elevated px-2 py-0.5 rounded"
              >
                {path}
              </code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FleetPage() {
  // Force re-render every 10s so relative timestamps stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const totalAgents = DEMO_AGENTS.length;
  const activeAgents = DEMO_AGENTS.filter(
    (a) => a.status === 'building' || a.status === 'testing',
  ).length;
  const idleAgents = DEMO_AGENTS.filter((a) => a.status === 'idle').length;
  const disconnectedAgents = DEMO_AGENTS.filter(
    (a) => a.status === 'disconnected',
  ).length;

  const unresolvedConflicts = DEMO_CONFLICTS.filter((c) => !c.resolved);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Fleet</h1>
        <p className="text-sm text-text-secondary mt-1">
          Real-time view of all connected agents.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Agents" value={totalAgents} color="text-text-primary" />
        <StatCard label="Active" value={activeAgents} color="text-accent-primary" />
        <StatCard label="Idle" value={idleAgents} color="text-text-secondary" />
        <StatCard
          label="Disconnected"
          value={disconnectedAgents}
          color="text-text-muted"
        />
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {DEMO_AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Active Conflicts */}
      {unresolvedConflicts.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Active Conflicts
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              File overlaps and path conflicts between agents.
            </p>
          </div>
          <div className="grid gap-4">
            {unresolvedConflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                agents={DEMO_AGENTS}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
