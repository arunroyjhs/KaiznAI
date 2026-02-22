export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Workspace configuration and integrations.
        </p>
      </div>

      <div className="grid gap-6">
        <section className="bg-surface rounded-lg border border-border p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">LLM Providers</h2>
          <p className="text-sm text-text-secondary">
            Connect your AI providers. Use your existing Claude, ChatGPT, or Perplexity
            subscription.
          </p>
          <button className="mt-4 px-4 py-2 text-sm bg-surface-elevated text-text-secondary border border-border rounded-md hover:bg-border hover:text-text-primary transition-colors">
            Add Provider
          </button>
        </section>

        <section className="bg-surface rounded-lg border border-border p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">Signal Connectors</h2>
          <p className="text-sm text-text-secondary">
            Connect your analytics stack. Mixpanel, PostgreSQL, and more.
          </p>
          <button className="mt-4 px-4 py-2 text-sm bg-surface-elevated text-text-secondary border border-border rounded-md hover:bg-border hover:text-text-primary transition-colors">
            Add Connector
          </button>
        </section>

        <section className="bg-surface rounded-lg border border-border p-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">Feature Flags</h2>
          <p className="text-sm text-text-secondary">
            Connect LaunchDarkly, Unleash, or your feature flag service.
          </p>
          <button className="mt-4 px-4 py-2 text-sm bg-surface-elevated text-text-secondary border border-border rounded-md hover:bg-border hover:text-text-primary transition-colors">
            Configure
          </button>
        </section>
      </div>
    </div>
  );
}
