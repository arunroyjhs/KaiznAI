'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Outcomes', icon: '◎' },
  { href: '/experiments', label: 'Experiments', icon: '⬡' },
  { href: '/gates', label: 'Gates', icon: '⊘', badge: true },
  { href: '/signals', label: 'Signals', icon: '∿' },
  { href: '/learnings', label: 'Learnings', icon: '◈' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">
          Outcome Runtime
        </h1>
        <p className="text-xs text-text-muted mt-0.5">v0.1.0</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent-glow text-accent-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-text-muted">
          Outcomes over tickets.
        </p>
      </div>
    </aside>
  );
}
