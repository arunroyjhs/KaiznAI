interface SignificanceMeterProps {
  value: number; // 0 to 1
  threshold?: number; // default 0.95
  label?: string;
}

export function SignificanceMeter({
  value,
  threshold = 0.95,
  label = 'Statistical Significance',
}: SignificanceMeterProps) {
  const percent = Math.min(value * 100, 100);
  const thresholdPercent = threshold * 100;
  const isSignificant = value >= threshold;

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">{label}</span>
        <span
          className={`text-sm font-mono font-medium ${
            isSignificant ? 'text-signal-positive' : 'text-text-secondary'
          }`}
        >
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="relative w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-signal-positive z-10"
          style={{ left: `${thresholdPercent}%` }}
        />
        {/* Progress bar */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isSignificant ? 'bg-signal-positive' : 'bg-accent-primary'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-muted">0%</span>
        <span className="text-[10px] text-signal-positive">{thresholdPercent}% threshold</span>
        <span className="text-[10px] text-text-muted">100%</span>
      </div>
      {isSignificant && (
        <p className="text-xs text-signal-positive mt-2">
          Result is statistically significant.
        </p>
      )}
    </div>
  );
}
