interface GateCardProps {
  id: string;
  gateType: string;
  experimentTitle: string;
  outcomeTitle: string;
  question: string;
  assignedTo: string;
  status: 'pending' | 'approved' | 'rejected' | 'approved_with_conditions' | 'timed_out';
  slaHours: number;
  createdAt: string;
}

const GATE_STATUS_BORDER: Record<string, string> = {
  pending: 'border-l-signal-warning',
  approved: 'border-l-signal-positive',
  rejected: 'border-l-signal-negative',
  approved_with_conditions: 'border-l-signal-positive',
  timed_out: 'border-l-signal-negative',
};

export function GateCard({
  gateType,
  experimentTitle,
  outcomeTitle,
  question,
  assignedTo,
  status,
  slaHours,
  createdAt,
}: GateCardProps) {
  const borderClass = GATE_STATUS_BORDER[status] ?? 'border-l-signal-warning';
  const createdDate = new Date(createdAt);
  const hoursElapsed = Math.round(
    (Date.now() - createdDate.getTime()) / (1000 * 60 * 60) * 10
  ) / 10;
  const isOverdue = hoursElapsed > slaHours;

  return (
    <div
      className={`bg-surface rounded-lg border border-border border-l-[6px] ${borderClass} p-5`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-medium text-accent-primary uppercase tracking-wider">
            {gateType.replace(/_/g, ' ')}
          </span>
          <h3 className="text-base font-medium text-text-primary mt-1">{experimentTitle}</h3>
          <p className="text-sm text-text-muted">{outcomeTitle}</p>
        </div>
        <div className="text-right">
          <span
            className={`text-xs font-mono ${isOverdue ? 'text-signal-negative' : 'text-signal-warning'}`}
          >
            {hoursElapsed}h / {slaHours}h
          </span>
        </div>
      </div>

      <p className="text-sm text-text-secondary mb-4">{question}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">Assigned to: {assignedTo}</span>
        {status === 'pending' && (
          <div className="flex gap-2">
            <button className="px-4 py-1.5 text-sm bg-signal-negative/10 text-signal-negative border border-signal-negative/20 rounded-md hover:bg-signal-negative/20 transition-colors">
              Reject
            </button>
            <button className="px-4 py-1.5 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors">
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
