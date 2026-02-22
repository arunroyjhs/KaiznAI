'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Wire to Better Auth sign-in
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-text-primary">Outcome Runtime</h1>
          <p className="text-sm text-text-secondary mt-2">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-lg border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
              placeholder="you@company.com"
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
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 text-sm font-medium bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-2 text-text-muted">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="py-2 text-sm bg-surface-elevated border border-border rounded-md text-text-secondary hover:text-text-primary transition-colors"
            >
              Google
            </button>
            <button
              type="button"
              className="py-2 text-sm bg-surface-elevated border border-border rounded-md text-text-secondary hover:text-text-primary transition-colors"
            >
              GitHub
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-text-muted mt-4">
          Don't have an account?{' '}
          <a href="/auth/signup" className="text-accent-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
