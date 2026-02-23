'use client';

import { useState } from 'react';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Sign up failed');
      }

      // Create organization after successful sign-up
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      await fetch(`${apiBase}/api/v1/workspace`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: crypto.randomUUID(), name: orgName }),
      }).catch(() => {});

      window.location.href = '/onboarding';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">Outcome Runtime</h1>
          <p className="text-sm text-text-secondary mt-2">Create your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-lg border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
              placeholder="Jane Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Work email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
              placeholder="jane@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Organization name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
              placeholder="Acme Inc."
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 text-sm font-medium bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating workspace...' : 'Create workspace'}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted mt-4">
          Already have an account?{' '}
          <a href="/auth/login" className="text-accent-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
