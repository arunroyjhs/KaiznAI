'use client';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Get started with outcome-driven development.',
    isCurrent: true,
    features: [
      { name: '2 Outcomes', included: true },
      { name: '3 Experiments per Outcome', included: true },
      { name: '1 Agent', included: true },
      { name: '2 Signal Connectors', included: true },
      { name: '100K LLM tokens/month', included: true },
      { name: 'Custom Connectors', included: false },
      { name: 'SSO / SAML', included: false },
      { name: 'Audit Logs', included: false },
      { name: 'Priority Support', included: false },
      { name: 'White Label', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For teams shipping their first outcomes.',
    isCurrent: false,
    highlight: true,
    features: [
      { name: '20 Outcomes', included: true },
      { name: '10 Experiments per Outcome', included: true },
      { name: '5 Agents', included: true },
      { name: '10 Signal Connectors', included: true },
      { name: '1M LLM tokens/month', included: true },
      { name: 'Custom Connectors', included: true },
      { name: 'SSO / SAML', included: false },
      { name: 'Audit Logs', included: true },
      { name: 'Priority Support', included: false },
      { name: 'White Label', included: false },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$199',
    period: '/month',
    description: 'Scale across teams with advanced governance.',
    isCurrent: false,
    features: [
      { name: '100 Outcomes', included: true },
      { name: '20 Experiments per Outcome', included: true },
      { name: '20 Agents', included: true },
      { name: '50 Signal Connectors', included: true },
      { name: '10M LLM tokens/month', included: true },
      { name: 'Custom Connectors', included: true },
      { name: 'SSO / SAML', included: true },
      { name: 'Audit Logs', included: true },
      { name: 'Priority Support', included: true },
      { name: 'White Label', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Dedicated infrastructure and unlimited everything.',
    isCurrent: false,
    features: [
      { name: 'Unlimited Outcomes', included: true },
      { name: 'Unlimited Experiments', included: true },
      { name: 'Unlimited Agents', included: true },
      { name: 'Unlimited Signal Connectors', included: true },
      { name: 'Unlimited LLM tokens', included: true },
      { name: 'Custom Connectors', included: true },
      { name: 'SSO / SAML', included: true },
      { name: 'Audit Logs', included: true },
      { name: 'Priority Support', included: true },
      { name: 'White Label', included: true },
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-signal-positive flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      className="w-4 h-4 text-text-muted flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function BillingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Billing</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Current Plan Banner */}
      <div className="bg-surface rounded-lg border border-border p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted mb-1">Current Plan</p>
          <p className="text-lg font-semibold text-text-primary">Free</p>
          <p className="text-sm text-text-secondary mt-0.5">
            2 outcomes, 100K tokens/month
          </p>
        </div>
        <button className="px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:border-border-strong transition-colors">
          Manage Billing
        </button>
      </div>

      {/* Pricing Grid */}
      <h2 className="text-lg font-medium text-text-primary mb-4">Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-surface rounded-lg border p-6 flex flex-col ${
              plan.highlight
                ? 'border-accent-primary ring-1 ring-accent-primary/20'
                : 'border-border'
            }`}
          >
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-text-primary">{plan.name}</h3>
                {plan.highlight && (
                  <span className="text-[10px] px-2 py-0.5 bg-accent-glow rounded border border-accent-primary/20 text-accent-primary font-medium">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary">{plan.description}</p>
            </div>

            {/* Price */}
            <div className="mb-6">
              <span className="text-3xl font-bold text-text-primary">{plan.price}</span>
              {plan.period && (
                <span className="text-sm text-text-muted">{plan.period}</span>
              )}
            </div>

            {/* CTA */}
            {plan.isCurrent ? (
              <button
                disabled
                className="w-full py-2 px-4 text-sm rounded-md border border-border text-text-muted bg-surface cursor-not-allowed mb-6"
              >
                Current Plan
              </button>
            ) : plan.id === 'enterprise' ? (
              <button className="w-full py-2 px-4 text-sm rounded-md border border-border text-text-primary hover:border-border-strong transition-colors mb-6">
                Contact Sales
              </button>
            ) : (
              <button
                className={`w-full py-2 px-4 text-sm rounded-md transition-colors mb-6 ${
                  plan.highlight
                    ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
                    : 'border border-accent-primary text-accent-primary hover:bg-accent-primary/10'
                }`}
              >
                Upgrade to {plan.name}
              </button>
            )}

            {/* Features */}
            <ul className="space-y-2.5 flex-1">
              {plan.features.map((feature) => (
                <li key={feature.name} className="flex items-center gap-2">
                  {feature.included ? <CheckIcon /> : <CrossIcon />}
                  <span
                    className={`text-sm ${
                      feature.included ? 'text-text-secondary' : 'text-text-muted'
                    }`}
                  >
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ / Additional Info */}
      <div className="mt-8 bg-surface rounded-lg border border-border p-6">
        <h2 className="text-lg font-medium text-text-primary mb-4">Billing FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Can I change plans at any time?
            </h3>
            <p className="text-sm text-text-secondary">
              Yes. Upgrades take effect immediately. Downgrades take effect at the end of your
              current billing period.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              What happens if I exceed my limits?
            </h3>
            <p className="text-sm text-text-secondary">
              You will receive a notification when approaching limits. Experiments will pause once
              limits are reached until the next billing cycle or an upgrade.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Do you offer annual pricing?
            </h3>
            <p className="text-sm text-text-secondary">
              Annual billing with a 20% discount is available for Pro and Team plans. Contact us for
              Enterprise pricing.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-1">
              How are LLM tokens counted?
            </h3>
            <p className="text-sm text-text-secondary">
              Tokens are counted across all connected LLM providers. Both input and output tokens
              count toward your monthly limit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
