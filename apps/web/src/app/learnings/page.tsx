'use client';

import { useState } from 'react';

interface Learning {
  id: string;
  finding: string;
  findingType: string;
  confidence: number;
  appliesTo: string[];
  experimentTitle: string;
  outcomeTitle: string;
  createdAt: string;
  qualityScore: number;
}

const DEMO_LEARNINGS: Learning[] = [
  {
    id: '1',
    finding: 'Reducing checkout form steps from 5 to 3 increased mobile completion rate by 8.2%. The biggest drop-off was between payment entry and confirmation — simplifying this step alone accounted for 60% of the improvement.',
    findingType: 'confirmed_hypothesis',
    confidence: 0.94,
    appliesTo: ['mobile', 'checkout', 'form-ux'],
    experimentTitle: 'Simplified mobile checkout form',
    outcomeTitle: 'Reduce Mobile Checkout Abandonment',
    createdAt: '2024-01-15',
    qualityScore: 0.87,
  },
  {
    id: '2',
    finding: 'Guest checkout had no statistically significant impact on abandonment rate. Users who abandon do so before reaching the account creation step. The bottleneck is earlier in the funnel.',
    findingType: 'refuted_hypothesis',
    confidence: 0.91,
    appliesTo: ['checkout', 'authentication'],
    experimentTitle: 'Guest checkout option',
    outcomeTitle: 'Reduce Mobile Checkout Abandonment',
    createdAt: '2024-01-12',
    qualityScore: 0.72,
  },
  {
    id: '3',
    finding: 'Mobile users on iOS convert 23% higher than Android users in checkout. This segment difference was not in our original hypothesis but appeared consistently across all experiments.',
    findingType: 'segment_insight',
    confidence: 0.88,
    appliesTo: ['mobile', 'checkout', 'segmentation'],
    experimentTitle: 'Progressive form disclosure',
    outcomeTitle: 'Reduce Mobile Checkout Abandonment',
    createdAt: '2024-01-10',
    qualityScore: 0.65,
  },
  {
    id: '4',
    finding: 'Page load time above 2.5s on checkout causes a measurable drop in completion rate. This constraint was discovered during the checkout simplification experiment when a poorly optimized image slowed the new form.',
    findingType: 'constraint_discovered',
    confidence: 0.82,
    appliesTo: ['performance', 'checkout'],
    experimentTitle: 'Simplified mobile checkout form',
    outcomeTitle: 'Reduce Mobile Checkout Abandonment',
    createdAt: '2024-01-08',
    qualityScore: 0.58,
  },
];

const FINDING_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  confirmed_hypothesis: { bg: 'bg-signal-positive/10', text: 'text-signal-positive', label: 'Confirmed' },
  refuted_hypothesis: { bg: 'bg-signal-negative/10', text: 'text-signal-negative', label: 'Refuted' },
  unexpected_effect: { bg: 'bg-signal-warning/10', text: 'text-signal-warning', label: 'Unexpected' },
  segment_insight: { bg: 'bg-accent-primary/10', text: 'text-accent-primary', label: 'Segment Insight' },
  constraint_discovered: { bg: 'bg-signal-warning/10', text: 'text-signal-warning', label: 'Constraint' },
  methodology_learning: { bg: 'bg-text-muted/10', text: 'text-text-secondary', label: 'Methodology' },
};

export default function LearningsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = DEMO_LEARNINGS.filter((l) => {
    const matchesSearch = !searchQuery ||
      l.finding.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.appliesTo.some((t) => t.includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || l.findingType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Learnings</h1>
          <p className="text-sm text-text-secondary mt-1">
            Every experiment adds to your knowledge base. The system gets smarter with every cycle.
          </p>
        </div>
        <button className="px-4 py-2 text-sm bg-surface-elevated text-text-secondary border border-border rounded-md hover:text-text-primary transition-colors">
          Export as Markdown
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search learnings... (e.g. checkout, mobile, form-ux)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 text-sm bg-surface border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 text-sm bg-surface border border-border rounded-md text-text-secondary focus:outline-none focus:border-accent-primary"
        >
          <option value="all">All Types</option>
          <option value="confirmed_hypothesis">Confirmed</option>
          <option value="refuted_hypothesis">Refuted</option>
          <option value="unexpected_effect">Unexpected</option>
          <option value="segment_insight">Segment Insight</option>
          <option value="constraint_discovered">Constraint</option>
          <option value="methodology_learning">Methodology</option>
        </select>
      </div>

      {/* Learnings List */}
      <div className="grid gap-4">
        {filtered.map((learning) => {
          const typeStyle = FINDING_TYPE_COLORS[learning.findingType] ?? FINDING_TYPE_COLORS.methodology_learning;

          return (
            <div
              key={learning.id}
              className="bg-surface rounded-lg border border-border p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${typeStyle!.bg} ${typeStyle!.text}`}
                  >
                    {typeStyle!.label}
                  </span>
                  <span className="text-xs text-text-muted">
                    {learning.experimentTitle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Quality:</span>
                  <span className="text-xs font-mono text-accent-primary">
                    {Math.round(learning.qualityScore * 100)}%
                  </span>
                </div>
              </div>

              <p className="text-sm text-text-primary leading-relaxed mb-3">
                {learning.finding}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {learning.appliesTo.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 bg-surface-elevated border border-border rounded text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>Confidence: {Math.round(learning.confidence * 100)}%</span>
                  <span>{learning.createdAt}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary text-base">
            {searchQuery
              ? 'No learnings match your search.'
              : "Your first experiment's results will appear here. The more you run, the smarter the system gets."}
          </p>
        </div>
      )}
    </div>
  );
}
