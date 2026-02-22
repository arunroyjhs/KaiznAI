import Link from 'next/link';

const SETTINGS_SECTIONS = [
  {
    href: '/settings/providers',
    title: 'LLM Providers',
    description: 'Connect your AI providers. Use your existing Claude, ChatGPT, or Perplexity subscription.',
  },
  {
    href: '/settings/usage',
    title: 'Token Usage',
    description: 'Track LLM spend per provider. Monitor costs and optimize model selection.',
  },
  {
    href: '/settings/billing',
    title: 'Billing',
    description: 'Manage your subscription, upgrade plans, and view billing history.',
  },
  {
    href: '#',
    title: 'Signal Connectors',
    description: 'Connect your analytics stack. Mixpanel, PostgreSQL, and more.',
  },
  {
    href: '#',
    title: 'Feature Flags',
    description: 'Connect LaunchDarkly, Unleash, or your feature flag service.',
  },
  {
    href: '#',
    title: 'Notifications',
    description: 'Configure Slack, email, and webhook notifications for gates.',
  },
];

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Workspace configuration and integrations.
        </p>
      </div>

      <div className="grid gap-4">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="bg-surface rounded-lg border border-border p-6 hover:border-border-strong transition-colors block"
          >
            <h2 className="text-lg font-medium text-text-primary mb-2">{section.title}</h2>
            <p className="text-sm text-text-secondary">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
