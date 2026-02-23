import { ExperimentCard } from '../../components/experiment-card';

const DEMO_EXPERIMENTS = [
  {
    id: 'exp-1',
    title: 'Simplified mobile checkout form',
    hypothesis:
      'Reducing the checkout form from 5 steps to 3 steps will increase completion by removing friction points where users abandon.',
    status: 'running',
    currentDelta: 0.04,
    predictedDelta: 0.08,
    significance: 0.72,
    agentRuntime: 'claude-code',
  },
  {
    id: 'exp-2',
    title: 'Guest checkout option',
    hypothesis:
      'Adding a guest checkout option will reduce abandonment by removing the account creation barrier.',
    status: 'building',
    predictedDelta: 0.12,
    agentRuntime: 'cursor',
  },
  {
    id: 'exp-3',
    title: 'Progressive form disclosure',
    hypothesis:
      'Showing form fields progressively as users complete each section will reduce perceived complexity.',
    status: 'hypothesis',
    predictedDelta: 0.05,
  },
];

export default function ExperimentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Experiments</h1>
        <p className="text-sm text-text-secondary mt-1">
          Every change is a falsifiable hypothesis with a measured result.
        </p>
      </div>

      <div className="grid gap-4">
        {DEMO_EXPERIMENTS.map((exp) => (
          <ExperimentCard key={exp.id} {...exp} />
        ))}
      </div>
    </div>
  );
}
