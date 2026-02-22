'use client';

import { useState } from 'react';
import Link from 'next/link';

interface InvitedMember {
  email: string;
  status: 'pending' | 'accepted';
  invitedAt: string;
}

const DEMO_MEMBERS: InvitedMember[] = [
  { email: 'alex@acme.com', status: 'accepted', invitedAt: '2 hours ago' },
  { email: 'jordan@acme.com', status: 'pending', invitedAt: '1 hour ago' },
  { email: 'sam@acme.com', status: 'pending', invitedAt: '30 minutes ago' },
];

export default function InvitePage() {
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<InvitedMember[]>(DEMO_MEMBERS);

  const handleInvite = () => {
    if (!email.trim() || !email.includes('@')) return;

    // TODO: Wire up to API — POST /api/invites { email }
    setMembers((prev) => [
      ...prev,
      { email: email.trim(), status: 'pending', invitedAt: 'Just now' },
    ]);
    setEmail('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInvite();
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-surface rounded-xl border border-border p-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            Invite your team
          </h1>
          <p className="text-text-secondary mb-8">
            Collaboration makes experiments faster.
          </p>

          {/* Invite input */}
          <div className="flex gap-3 mb-8">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="colleague@company.com"
              className="flex-1 px-4 py-2 bg-void border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
            />
            <button
              onClick={handleInvite}
              disabled={!email.trim() || !email.includes('@')}
              className="px-4 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Send Invite
            </button>
          </div>

          {/* Invited members list */}
          {members.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-text-secondary">
                Invited members ({members.length})
              </h2>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between px-4 py-3 bg-void rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm text-text-primary">{member.email}</p>
                      <p className="text-xs text-text-muted">{member.invitedAt}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.status === 'accepted'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      {member.status === 'accepted' ? 'Accepted' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Link
              href="/dashboard"
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip for now
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-accent-primary text-white text-sm font-medium rounded-lg hover:bg-accent-primary/90 transition-colors inline-block"
            >
              Continue to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
