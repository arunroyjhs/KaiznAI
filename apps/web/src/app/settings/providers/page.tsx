'use client';

import { useState } from 'react';

interface Provider {
  id: string;
  name: string;
  authMode: 'api_key' | 'oauth_account';
  keyHint?: string;
  accountEmail?: string;
  preferredModel?: string;
  isActive: boolean;
}

const DEMO_PROVIDERS: Provider[] = [
  {
    id: '1',
    name: 'anthropic',
    authMode: 'api_key',
    keyHint: '...sk4f',
    preferredModel: 'claude-opus-4',
    isActive: true,
  },
  {
    id: '2',
    name: 'openai',
    authMode: 'oauth_account',
    accountEmail: 'user@gmail.com',
    preferredModel: 'gpt-4o',
    isActive: true,
  },
];

const AVAILABLE_PROVIDERS = [
  {
    slug: 'anthropic',
    label: 'Anthropic (Claude)',
    models: ['claude-opus-4', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
    supportsOAuth: true,
  },
  {
    slug: 'openai',
    label: 'OpenAI (ChatGPT)',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
    supportsOAuth: true,
  },
  {
    slug: 'perplexity',
    label: 'Perplexity',
    models: ['sonar-pro', 'llama-3.1-sonar-large-128k-online'],
    supportsOAuth: true,
  },
  {
    slug: 'ollama',
    label: 'Ollama (Local)',
    models: ['llama3.1', 'codellama', 'mistral'],
    supportsOAuth: false,
  },
];

export default function ProvidersPage() {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">LLM Providers</h1>
          <p className="text-sm text-text-secondary mt-1">
            Use your existing Claude, ChatGPT, or Perplexity subscription. API key or account
            OAuth — you choose.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Provider'}
        </button>
      </div>

      {/* Add Provider Form */}
      {showAddForm && (
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-medium text-text-primary mb-4">Connect a Provider</h2>
          <div className="grid grid-cols-2 gap-4">
            {AVAILABLE_PROVIDERS.map((provider) => (
              <button
                key={provider.slug}
                className="text-left p-4 bg-surface-elevated rounded-lg border border-border hover:border-accent-primary transition-colors"
              >
                <h3 className="text-sm font-medium text-text-primary">{provider.label}</h3>
                <p className="text-xs text-text-muted mt-1">
                  Models: {provider.models.slice(0, 2).join(', ')}
                  {provider.models.length > 2 && ` +${provider.models.length - 2} more`}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 bg-surface rounded border border-border text-text-muted">
                    API Key
                  </span>
                  {provider.supportsOAuth && (
                    <span className="text-[10px] px-2 py-0.5 bg-accent-glow rounded border border-accent-primary/20 text-accent-primary">
                      OAuth
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connected Providers */}
      <div className="grid gap-4">
        {DEMO_PROVIDERS.map((provider) => (
          <div
            key={provider.id}
            className="bg-surface rounded-lg border border-border p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-2 h-2 rounded-full ${
                  provider.isActive ? 'bg-signal-positive' : 'bg-text-muted'
                }`}
              />
              <div>
                <h3 className="text-sm font-medium text-text-primary capitalize">
                  {provider.name}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {provider.authMode === 'api_key'
                    ? `API Key: ${provider.keyHint}`
                    : `OAuth: ${provider.accountEmail}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {provider.preferredModel && (
                <span className="text-xs font-mono text-text-secondary bg-surface-elevated px-2 py-1 rounded">
                  {provider.preferredModel}
                </span>
              )}
              <button className="text-xs text-text-muted hover:text-signal-negative transition-colors">
                Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>

      {DEMO_PROVIDERS.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary text-base">
            No providers connected. Add one to start generating hypotheses.
          </p>
        </div>
      )}

      {/* Model Assignment */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-text-primary mb-4">Model Assignment</h2>
        <p className="text-sm text-text-secondary mb-4">
          Choose which model to use for each purpose. Use expensive models for hypothesis
          generation, cheaper ones for routine analysis.
        </p>
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Purpose
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">
                  Model
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { purpose: 'Hypothesis Generation', model: 'claude-opus-4' },
                { purpose: 'Hypothesis Scoring', model: 'claude-sonnet-4-5' },
                { purpose: 'Analysis', model: 'claude-sonnet-4-5' },
                { purpose: 'Context Summarization', model: 'claude-haiku-4-5' },
                { purpose: 'Decision Synthesis', model: 'claude-sonnet-4-5' },
              ].map((row) => (
                <tr key={row.purpose} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-text-primary">{row.purpose}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-accent-primary">{row.model}</span>
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
