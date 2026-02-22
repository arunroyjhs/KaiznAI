'use client';

import { useState } from 'react';
import Link from 'next/link';

const STEPS = ['Welcome', 'Connect LLM', 'Connect Signal', 'First Outcome'];

const LLM_PROVIDERS = [
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic\'s Claude models for reasoning and analysis.',
    icon: '🧠',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'OpenAI\'s GPT models for broad language tasks.',
    icon: '💬',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Search-augmented AI for real-time data.',
    icon: '🔍',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Self-hosted open-source models. Full data control.',
    icon: '🏠',
  },
];

const SIGNAL_SOURCES = [
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Product analytics with event tracking and funnels.',
    icon: '📊',
  },
  {
    id: 'amplitude',
    name: 'Amplitude',
    description: 'Behavioral analytics for product teams.',
    icon: '📈',
  },
  {
    id: 'ga4',
    name: 'GA4',
    description: 'Google Analytics 4 for web and app analytics.',
    icon: '📉',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Query your database directly for custom metrics.',
    icon: '🗄️',
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);
  const [signalKey, setSignalKey] = useState('');
  const [outcomeName, setOutcomeName] = useState('');
  const [metric, setMetric] = useState('');
  const [target, setTarget] = useState('');

  const canProceed = () => {
    switch (step) {
      case 0:
        return name.trim().length > 0 && orgName.trim().length > 0;
      case 1:
        return selectedLLM !== null;
      case 2:
        return selectedSignal !== null;
      case 3:
        return outcomeName.trim().length > 0 && metric.trim().length > 0 && target.trim().length > 0;
      default:
        return false;
    }
  };

  const handleFinish = () => {
    // TODO: Wire up to API — POST /api/onboarding with all collected data
    // { name, orgName, llmProvider: selectedLLM, apiKey, signalSource: selectedSignal, signalKey, outcome: { name: outcomeName, metric, target } }
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  i <= step ? 'bg-accent-primary' : 'bg-border'
                }`}
              />
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px transition-colors ${
                    i < step ? 'bg-accent-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-2">
          <span className="text-xs text-text-muted uppercase tracking-wider">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <div className="bg-surface rounded-xl border border-border p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-semibold text-text-primary mb-2">
                Welcome to Outcome Runtime
              </h1>
              <p className="text-text-secondary mb-8">
                Let&apos;s set up your workspace. This takes about 2 minutes.
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
                    Your name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-text-secondary mb-1">
                    Organization name
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Inc."
                    className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Connect LLM */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-semibold text-text-primary mb-2">
                Connect an LLM Provider
              </h1>
              <p className="text-text-secondary mb-8">
                Choose the AI provider you want to use for generating hypotheses.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {LLM_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedLLM(provider.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedLLM === provider.id
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-void hover:border-border-strong'
                    }`}
                  >
                    <div className="text-2xl mb-2">{provider.icon}</div>
                    <h3 className="text-sm font-medium text-text-primary">{provider.name}</h3>
                    <p className="text-xs text-text-muted mt-1">{provider.description}</p>
                  </button>
                ))}
              </div>

              {selectedLLM && (
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-text-secondary mb-1">
                    API Key {selectedLLM === 'ollama' ? '(optional for local)' : ''}
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={selectedLLM === 'ollama' ? 'http://localhost:11434' : 'sk-...'}
                    className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                  />
                  {/* TODO: Wire up connection test — POST /api/providers/test */}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Connect Signal */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-semibold text-text-primary mb-2">
                Connect a Signal Source
              </h1>
              <p className="text-text-secondary mb-8">
                Where should we pull metrics and analytics data from?
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {SIGNAL_SOURCES.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSignal(source.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedSignal === source.id
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-void hover:border-border-strong'
                    }`}
                  >
                    <div className="text-2xl mb-2">{source.icon}</div>
                    <h3 className="text-sm font-medium text-text-primary">{source.name}</h3>
                    <p className="text-xs text-text-muted mt-1">{source.description}</p>
                  </button>
                ))}
              </div>

              {selectedSignal && (
                <div>
                  <label htmlFor="signalKey" className="block text-sm font-medium text-text-secondary mb-1">
                    {selectedSignal === 'postgresql' ? 'Connection String' : 'API Key / Project Token'}
                  </label>
                  <input
                    id="signalKey"
                    type="password"
                    value={signalKey}
                    onChange={(e) => setSignalKey(e.target.value)}
                    placeholder={
                      selectedSignal === 'postgresql'
                        ? 'postgres://user:pass@host:5432/db'
                        : 'Enter your project token...'
                    }
                    className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                  />
                  {/* TODO: Wire up connection test — POST /api/signals/test */}
                </div>
              )}
            </div>
          )}

          {/* Step 3: First Outcome */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-semibold text-text-primary mb-2">
                Create Your First Outcome
              </h1>
              <p className="text-text-secondary mb-8">
                Define a measurable goal. The runtime will generate hypotheses to achieve it.
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="outcomeName" className="block text-sm font-medium text-text-secondary mb-1">
                    Outcome name
                  </label>
                  <input
                    id="outcomeName"
                    type="text"
                    value={outcomeName}
                    onChange={(e) => setOutcomeName(e.target.value)}
                    placeholder="Increase trial-to-paid conversion"
                    className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label htmlFor="metric" className="block text-sm font-medium text-text-secondary mb-1">
                    Primary metric
                  </label>
                  <input
                    id="metric"
                    type="text"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    placeholder="conversion_rate"
                    className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label htmlFor="target" className="block text-sm font-medium text-text-secondary mb-1">
                    Target value
                  </label>
                  <input
                    id="target"
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="15%"
                    className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={`px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors ${
                step === 0 ? 'invisible' : ''
              }`}
            >
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="px-6 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canProceed()}
                className="px-6 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Outcome &amp; Continue
              </button>
            )}
          </div>
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <Link href="/dashboard" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
            Skip onboarding for now
          </Link>
        </div>
      </div>
    </div>
  );
}
