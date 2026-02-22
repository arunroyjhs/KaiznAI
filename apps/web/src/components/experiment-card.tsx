interface ExperimentCardProps {
  id: string;
  title: string;
  hypothesis: string;
  status: string;
  currentDelta?: number;
  predictedDelta: number;
  significance?: number;
  agentRuntime?: string;
}

const EXP_STATUS_DOT: Record<string, string> = {
  hypothesis: 'bg-text-muted',
  building: 'bg-signal-warning animate-pulse-dot',
  running: 'bg-signal-neutral animate-pulse-dot',
  measuring: 'bg-signal-neutral animate-pulse-dot',
  shipped: 'bg-signal-positive',
  killed: 'bg-signal-negative',
  failed_build: 'bg-signal-negative',
};

export function ExperimentCard({
  title,
  hypothesis,
  status,
  currentDelta,
  predictedDelta,
  significance,
  agentRuntime,
}: ExperimentCardProps) {
  const dotClass = EXP_STATUS_DOT[status] ?? 'bg-text-muted';
  const statusLabel = status.replace(/_/g, ' ');

  return (
    <div className="bg-surface rounded-lg border border-border p-5 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-text-primary">{title}</h4>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          <span className="text-xs text-text-muted capitalize">{statusLabel}</span>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-4 line-clamp-2">{hypothesis}</p>

      <div className="flex items-end gap-4 text-sm">
        <div>
          <p className="text-xs text-text-muted">Delta</p>
          <p className="font-mono text-text-primary">
            {currentDelta !== undefined
              ? `${currentDelta > 0 ? '+' : ''}${(currentDelta * 100).toFixed(1)}%`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Predicted</p>
          <p className="font-mono text-text-secondary">
            {predictedDelta > 0 ? '+' : ''}{(predictedDelta * 100).toFixed(1)}%
          </p>
        </div>
        {significance !== undefined && (
          <div>
            <p className="text-xs text-text-muted">Significance</p>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary rounded-full"
                  style={{ width: `${Math.min(significance * 100, 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-text-muted">
                {(significance * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
        {agentRuntime && (
          <div className="ml-auto">
            <p className="text-xs text-text-muted">Agent</p>
            <p className="text-xs text-accent-primary">{agentRuntime}</p>
          </div>
        )}
      </div>
    </div>
  );
}
