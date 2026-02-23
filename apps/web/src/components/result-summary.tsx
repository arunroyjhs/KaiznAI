interface ResultSummaryProps {
  delta: number;
  ciLower: number;
  ciUpper: number;
  pValue: number;
  sampleSizeControl: number;
  sampleSizeTreatment: number;
  isSignificant: boolean;
  direction: 'increase' | 'decrease';
}

export function ResultSummary({
  delta,
  ciLower,
  ciUpper,
  pValue,
  sampleSizeControl,
  sampleSizeTreatment,
  isSignificant,
  direction,
}: ResultSummaryProps) {
  // Determine if delta is "good" based on direction
  const isPositiveResult =
    (direction === 'increase' && delta > 0) ||
    (direction === 'decrease' && delta < 0);

  const deltaColor = isPositiveResult ? 'text-signal-positive' : 'text-signal-negative';

  return (
    <div className="bg-surface rounded-lg border border-border p-5">
      <h3 className="text-sm font-medium text-text-primary mb-4">Experiment Result</h3>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <p className="text-xs text-text-muted mb-1">Delta</p>
          <p className={`text-xl font-mono font-semibold ${deltaColor}`}>
            {delta > 0 ? '+' : ''}
            {(delta * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            [{(ciLower * 100).toFixed(2)}%, {(ciUpper * 100).toFixed(2)}%]
          </p>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-1">P-Value</p>
          <p className="text-xl font-mono font-semibold text-text-primary">
            {pValue.toFixed(4)}
          </p>
          <p className={`text-xs mt-0.5 ${isSignificant ? 'text-signal-positive' : 'text-text-muted'}`}>
            {isSignificant ? 'Significant' : 'Not significant'}
          </p>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-1">Control N</p>
          <p className="text-xl font-mono font-semibold text-text-secondary">
            {sampleSizeControl.toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-1">Treatment N</p>
          <p className="text-xl font-mono font-semibold text-text-secondary">
            {sampleSizeTreatment.toLocaleString()}
          </p>
        </div>
      </div>

      {isSignificant && isPositiveResult && (
        <div className="mt-4 p-3 bg-signal-positive/10 border border-signal-positive/20 rounded-md">
          <p className="text-sm text-signal-positive">
            This experiment shows a statistically significant positive result. Consider shipping.
          </p>
        </div>
      )}

      {isSignificant && !isPositiveResult && (
        <div className="mt-4 p-3 bg-signal-negative/10 border border-signal-negative/20 rounded-md">
          <p className="text-sm text-signal-negative">
            This experiment shows a statistically significant negative result. Consider killing.
          </p>
        </div>
      )}
    </div>
  );
}
