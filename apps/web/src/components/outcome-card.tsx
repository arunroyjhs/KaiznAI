interface OutcomeCardProps {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'achieved' | 'abandoned' | 'expired';
  signalValue?: number;
  targetValue: number;
  targetDirection: 'increase' | 'decrease';
  experimentCount: number;
  unit?: string;
}

const STATUS_STYLES: Record<string, { border: string; dot: string; label: string }> = {
  draft: { border: 'border-l-text-muted', dot: 'bg-text-muted', label: 'Draft' },
  active: { border: 'border-l-signal-neutral', dot: 'bg-signal-neutral animate-pulse-dot', label: 'Active' },
  achieved: { border: 'border-l-signal-positive', dot: 'bg-signal-positive', label: 'Achieved' },
  abandoned: { border: 'border-l-text-muted', dot: 'bg-text-muted', label: 'Abandoned' },
  expired: { border: 'border-l-signal-warning', dot: 'bg-signal-warning', label: 'Expired' },
};

export function OutcomeCard({
  title,
  status,
  signalValue,
  targetValue,
  targetDirection,
  experimentCount,
  unit,
}: OutcomeCardProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

  return (
    <div
      className={`bg-surface rounded-lg border border-border border-l-4 ${styles.border} p-5 hover:border-border-strong transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-medium text-text-primary">{title}</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
          <span className="text-xs text-text-muted">{styles.label}</span>
        </div>
      </div>

      <div className="flex items-end gap-6">
        <div>
          <p className="text-xs text-text-muted mb-1">Current</p>
          <p className="text-2xl font-semibold font-mono text-text-primary">
            {signalValue !== undefined ? signalValue.toFixed(2) : '—'}
            {unit && <span className="text-sm text-text-muted ml-1">{unit}</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">Target ({targetDirection})</p>
          <p className="text-2xl font-semibold font-mono text-signal-positive">
            {targetValue.toFixed(2)}
            {unit && <span className="text-sm text-text-muted ml-1">{unit}</span>}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-text-muted mb-1">Experiments</p>
          <p className="text-xl font-semibold font-mono text-text-secondary">{experimentCount}</p>
        </div>
      </div>
    </div>
  );
}
