interface UsageEntry {
  date: string;
  provider: string;
  model: string;
  purpose: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

const DEMO_USAGE: UsageEntry[] = [
  { date: '2024-01-15', provider: 'anthropic', model: 'claude-opus-4', purpose: 'hypothesis_generation', inputTokens: 4200, outputTokens: 2800, latencyMs: 8500 },
  { date: '2024-01-15', provider: 'anthropic', model: 'claude-sonnet-4-5', purpose: 'analysis', inputTokens: 1800, outputTokens: 900, latencyMs: 2100 },
  { date: '2024-01-14', provider: 'openai', model: 'gpt-4o', purpose: 'hypothesis_generation', inputTokens: 3600, outputTokens: 2400, latencyMs: 5200 },
  { date: '2024-01-14', provider: 'anthropic', model: 'claude-haiku-4-5', purpose: 'context_summarization', inputTokens: 800, outputTokens: 400, latencyMs: 450 },
  { date: '2024-01-13', provider: 'anthropic', model: 'claude-sonnet-4-5', purpose: 'decision_synthesis', inputTokens: 2200, outputTokens: 1100, latencyMs: 3200 },
];

const DEMO_SUMMARY = {
  totalInputTokens: 12600,
  totalOutputTokens: 7600,
  totalCalls: 5,
  avgLatencyMs: 3890,
  byProvider: [
    { provider: 'anthropic', calls: 4, inputTokens: 9000, outputTokens: 5200 },
    { provider: 'openai', calls: 1, inputTokens: 3600, outputTokens: 2400 },
  ],
};

export default function UsagePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Token Usage</h1>
        <p className="text-sm text-text-secondary mt-1">
          Track LLM spend per provider. Monitor costs and optimize model selection.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted mb-1">Total Input Tokens</p>
          <p className="text-xl font-mono font-semibold text-text-primary">
            {DEMO_SUMMARY.totalInputTokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted mb-1">Total Output Tokens</p>
          <p className="text-xl font-mono font-semibold text-text-primary">
            {DEMO_SUMMARY.totalOutputTokens.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted mb-1">API Calls</p>
          <p className="text-xl font-mono font-semibold text-text-primary">
            {DEMO_SUMMARY.totalCalls}
          </p>
        </div>
        <div className="bg-surface rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted mb-1">Avg Latency</p>
          <p className="text-xl font-mono font-semibold text-text-primary">
            {(DEMO_SUMMARY.avgLatencyMs / 1000).toFixed(1)}s
          </p>
        </div>
      </div>

      {/* By Provider */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-text-primary mb-4">By Provider</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_SUMMARY.byProvider.map((p) => (
            <div key={p.provider} className="bg-surface rounded-lg border border-border p-5">
              <h3 className="text-sm font-medium text-text-primary capitalize mb-3">
                {p.provider}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-text-muted">Calls</p>
                  <p className="font-mono text-text-primary">{p.calls}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Input</p>
                  <p className="font-mono text-text-primary">
                    {p.inputTokens.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Output</p>
                  <p className="font-mono text-text-primary">
                    {p.outputTokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Log */}
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-4">Recent Calls</h2>
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Provider
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Model
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Purpose
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Tokens
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Latency
                </th>
              </tr>
            </thead>
            <tbody>
              {DEMO_USAGE.map((entry, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                    {entry.date}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary capitalize">
                    {entry.provider}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-accent-primary">
                    {entry.model}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {entry.purpose.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-text-primary">
                    {(entry.inputTokens + entry.outputTokens).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-text-muted">
                    {(entry.latencyMs / 1000).toFixed(1)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
