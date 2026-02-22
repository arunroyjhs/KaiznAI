'use client';

import { useState } from 'react';

export default function CompliancePage() {
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [gdprEmail, setGdprEmail] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = (type: string) => {
    setExporting(type);
    // TODO: Wire up to API — POST /api/compliance/export { type, options }
    setTimeout(() => setExporting(null), 2000);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Compliance &amp; Data Export</h1>
        <p className="text-sm text-text-secondary mt-1">
          Export your organization data for compliance and regulatory requirements.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Full Data Export */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary mb-1">Full Data Export</h2>
              <p className="text-sm text-text-secondary">
                Export all organization data as JSON. Includes experiments, outcomes, signals, and configuration.
              </p>
              <p className="text-xs text-text-muted mt-2">Last exported: Never</p>
            </div>
            <button
              onClick={() => handleExport('full')}
              disabled={exporting === 'full'}
              className="px-4 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-4"
            >
              {exporting === 'full' ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Audit Log Export */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div>
            <h2 className="text-lg font-medium text-text-primary mb-1">Audit Log Export</h2>
            <p className="text-sm text-text-secondary mb-4">
              Download your audit log as a CSV file for external record-keeping.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="auditFrom" className="block text-xs font-medium text-text-muted mb-1">
                  From
                </label>
                <input
                  id="auditFrom"
                  type="date"
                  value={auditFrom}
                  onChange={(e) => setAuditFrom(e.target.value)}
                  className="px-4 py-2 bg-void border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary text-sm"
                />
              </div>
              <div>
                <label htmlFor="auditTo" className="block text-xs font-medium text-text-muted mb-1">
                  To
                </label>
                <input
                  id="auditTo"
                  type="date"
                  value={auditTo}
                  onChange={(e) => setAuditTo(e.target.value)}
                  className="px-4 py-2 bg-void border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary text-sm"
                />
              </div>
              <button
                onClick={() => handleExport('audit')}
                disabled={exporting === 'audit'}
                className="px-4 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'audit' ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        </div>

        {/* Experiment Data */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-medium text-text-primary mb-1">Experiment Data</h2>
              <p className="text-sm text-text-secondary">
                Export all experiment results, hypotheses, and learnings as a structured JSON archive.
              </p>
            </div>
            <button
              onClick={() => handleExport('experiments')}
              disabled={exporting === 'experiments'}
              className="px-4 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-4"
            >
              {exporting === 'experiments' ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* GDPR User Data */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div>
            <h2 className="text-lg font-medium text-text-primary mb-1">User Data (GDPR)</h2>
            <p className="text-sm text-text-secondary mb-4">
              Export or delete a specific user&apos;s data for GDPR compliance requests.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[250px]">
                <label htmlFor="gdprEmail" className="block text-xs font-medium text-text-muted mb-1">
                  User email
                </label>
                <input
                  id="gdprEmail"
                  type="email"
                  value={gdprEmail}
                  onChange={(e) => setGdprEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary text-sm"
                />
              </div>
              <button
                onClick={() => handleExport('gdpr-export')}
                disabled={!gdprEmail.includes('@') || exporting === 'gdpr-export'}
                className="px-4 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'gdpr-export' ? 'Exporting...' : 'Export User Data'}
              </button>
              <button
                onClick={() => handleExport('gdpr-delete')}
                disabled={!gdprEmail.includes('@') || exporting === 'gdpr-delete'}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === 'gdpr-delete' ? 'Processing...' : 'Request Deletion'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
