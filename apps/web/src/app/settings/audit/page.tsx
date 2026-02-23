'use client';

import { useState } from 'react';

type ActionType = 'all' | 'auth' | 'experiment' | 'gate' | 'setting' | 'billing';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: { name: string; email: string };
  action: string;
  actionType: ActionType;
  resource: string;
  details: string;
}

const DEMO_ENTRIES: AuditEntry[] = [
  {
    id: '1',
    timestamp: '2026-02-22 14:32:01',
    actor: { name: 'Jane Smith', email: 'jane@acme.com' },
    action: 'user.login',
    actionType: 'auth',
    resource: 'Session',
    details: 'Logged in via SSO (Okta)',
  },
  {
    id: '2',
    timestamp: '2026-02-22 14:28:15',
    actor: { name: 'Alex Chen', email: 'alex@acme.com' },
    action: 'experiment.created',
    actionType: 'experiment',
    resource: 'Experiment #42',
    details: 'Created experiment "Checkout flow simplification"',
  },
  {
    id: '3',
    timestamp: '2026-02-22 13:55:44',
    actor: { name: 'Jordan Lee', email: 'jordan@acme.com' },
    action: 'gate.approved',
    actionType: 'gate',
    resource: 'Gate #18',
    details: 'Approved gate "Deploy pricing change to 50% of users"',
  },
  {
    id: '4',
    timestamp: '2026-02-22 12:10:30',
    actor: { name: 'Jane Smith', email: 'jane@acme.com' },
    action: 'setting.updated',
    actionType: 'setting',
    resource: 'LLM Provider',
    details: 'Updated Claude API key',
  },
  {
    id: '5',
    timestamp: '2026-02-21 18:42:00',
    actor: { name: 'Sam Taylor', email: 'sam@acme.com' },
    action: 'experiment.completed',
    actionType: 'experiment',
    resource: 'Experiment #39',
    details: 'Experiment "Onboarding email sequence" completed with +12% uplift',
  },
  {
    id: '6',
    timestamp: '2026-02-21 16:20:11',
    actor: { name: 'Alex Chen', email: 'alex@acme.com' },
    action: 'billing.upgraded',
    actionType: 'billing',
    resource: 'Subscription',
    details: 'Upgraded from Starter to Team plan',
  },
  {
    id: '7',
    timestamp: '2026-02-21 10:05:33',
    actor: { name: 'Jordan Lee', email: 'jordan@acme.com' },
    action: 'gate.rejected',
    actionType: 'gate',
    resource: 'Gate #17',
    details: 'Rejected gate "Remove free tier limitations" — needs more data',
  },
  {
    id: '8',
    timestamp: '2026-02-20 09:15:00',
    actor: { name: 'Jane Smith', email: 'jane@acme.com' },
    action: 'user.invited',
    actionType: 'auth',
    resource: 'User',
    details: 'Invited sam@acme.com to the workspace',
  },
];

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'all', label: 'All Actions' },
  { value: 'auth', label: 'Authentication' },
  { value: 'experiment', label: 'Experiment' },
  { value: 'gate', label: 'Gate' },
  { value: 'setting', label: 'Setting' },
  { value: 'billing', label: 'Billing' },
];

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState<ActionType>('all');
  const [actorFilter, setActorFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 5;

  const filtered = DEMO_ENTRIES.filter((entry) => {
    if (actionFilter !== 'all' && entry.actionType !== actionFilter) return false;
    if (
      actorFilter &&
      !entry.actor.name.toLowerCase().includes(actorFilter.toLowerCase()) &&
      !entry.actor.email.toLowerCase().includes(actorFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const actionTypeColor = (type: ActionType): string => {
    switch (type) {
      case 'auth':
        return 'bg-blue-500/10 text-blue-400';
      case 'experiment':
        return 'bg-purple-500/10 text-purple-400';
      case 'gate':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'setting':
        return 'bg-gray-500/10 text-gray-400';
      case 'billing':
        return 'bg-green-500/10 text-green-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Audit Log</h1>
        <p className="text-sm text-text-secondary mt-1">
          Complete record of all actions in your workspace.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={actorFilter}
          onChange={(e) => {
            setActorFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by actor..."
          className="px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary text-sm"
        />
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value as ActionType);
            setPage(1);
          }}
          className="px-4 py-2 bg-void border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary text-sm"
        >
          {ACTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="px-4 py-2 bg-void border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary text-sm"
          />
          <span className="text-text-muted text-sm">to</span>
          <input
            type="date"
            className="px-4 py-2 bg-void border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-primary text-sm"
          />
        </div>
      </div>

      {/* Audit entries */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border text-xs font-medium text-text-muted uppercase tracking-wider">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-2">Resource</div>
          <div className="col-span-4">Details</div>
        </div>

        {/* Rows */}
        {paginated.length === 0 ? (
          <div className="px-6 py-12 text-center text-text-muted text-sm">
            No audit entries match your filters.
          </div>
        ) : (
          paginated.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-border last:border-b-0 hover:bg-void/50 transition-colors"
            >
              <div className="col-span-2 text-xs text-text-muted font-mono">
                {entry.timestamp}
              </div>
              <div className="col-span-2">
                <p className="text-sm text-text-primary">{entry.actor.name}</p>
                <p className="text-xs text-text-muted">{entry.actor.email}</p>
              </div>
              <div className="col-span-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionTypeColor(entry.actionType)}`}
                >
                  {entry.action}
                </span>
              </div>
              <div className="col-span-2 text-sm text-text-secondary">
                {entry.resource}
              </div>
              <div className="col-span-4 text-sm text-text-secondary">
                {entry.details}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-text-muted">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of{' '}
          {filtered.length} entries
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-void border border-border rounded-lg text-text-secondary text-sm hover:border-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-void border border-border rounded-lg text-text-secondary text-sm hover:border-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
