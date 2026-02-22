'use client';

import { useState } from 'react';

type SSOStatus = 'not_configured' | 'configured' | 'active';

const SSO_PROVIDERS = [
  { value: 'okta', label: 'Okta' },
  { value: 'azure_ad', label: 'Azure AD' },
  { value: 'google_workspace', label: 'Google Workspace' },
  { value: 'custom_saml', label: 'Custom SAML' },
];

export default function SSOSettingsPage() {
  const [provider, setProvider] = useState('okta');
  const [entityId, setEntityId] = useState('');
  const [ssoUrl, setSsoUrl] = useState('');
  const [certificate, setCertificate] = useState('');
  const [audienceUri, setAudienceUri] = useState('');
  const [status, setStatus] = useState<SSOStatus>('not_configured');
  const [testing, setTesting] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    // TODO: Wire up to API — POST /api/settings/sso/test
    setTimeout(() => {
      setStatus('configured');
      setTesting(false);
    }, 1500);
  };

  const handleSave = () => {
    // TODO: Wire up to API — PUT /api/settings/sso
    // { provider, entityId, ssoUrl, certificate, audienceUri }
    setStatus('active');
  };

  const statusConfig: Record<SSOStatus, { label: string; color: string }> = {
    not_configured: { label: 'Not Configured', color: 'bg-gray-500/10 text-gray-400' },
    configured: { label: 'Configured', color: 'bg-yellow-500/10 text-yellow-400' },
    active: { label: 'Active', color: 'bg-green-500/10 text-green-400' },
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Single Sign-On (SSO)</h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure SAML or OIDC for your organization. Available on Team and Enterprise plans.
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig[status].color}`}
        >
          {statusConfig[status].label}
        </span>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 space-y-6">
        {/* Provider */}
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-text-secondary mb-1">
            Identity Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary"
          >
            {SSO_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entity ID */}
        <div>
          <label htmlFor="entityId" className="block text-sm font-medium text-text-secondary mb-1">
            Entity ID
          </label>
          <input
            id="entityId"
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="https://your-idp.example.com/entity-id"
            className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
        </div>

        {/* SSO URL */}
        <div>
          <label htmlFor="ssoUrl" className="block text-sm font-medium text-text-secondary mb-1">
            SSO URL
          </label>
          <input
            id="ssoUrl"
            type="url"
            value={ssoUrl}
            onChange={(e) => setSsoUrl(e.target.value)}
            placeholder="https://your-idp.example.com/sso/saml"
            className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
        </div>

        {/* Certificate */}
        <div>
          <label htmlFor="certificate" className="block text-sm font-medium text-text-secondary mb-1">
            Certificate
          </label>
          <textarea
            id="certificate"
            value={certificate}
            onChange={(e) => setCertificate(e.target.value)}
            placeholder="-----BEGIN CERTIFICATE-----&#10;Paste your X.509 certificate here...&#10;-----END CERTIFICATE-----"
            rows={5}
            className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary font-mono text-xs resize-none"
          />
        </div>

        {/* Audience URI */}
        <div>
          <label htmlFor="audienceUri" className="block text-sm font-medium text-text-secondary mb-1">
            Audience URI
          </label>
          <input
            id="audienceUri"
            type="text"
            value={audienceUri}
            onChange={(e) => setAudienceUri(e.target.value)}
            placeholder="https://app.outcomeruntime.com/auth/saml"
            className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={handleTestConnection}
            disabled={testing || !entityId || !ssoUrl}
            className="px-4 py-2 bg-void border border-border text-text-secondary text-sm font-medium rounded-lg hover:border-border-strong hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleSave}
            disabled={!entityId || !ssoUrl || !certificate}
            className="px-6 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
