import { GateCard } from '../../components/gate-card';

const DEMO_GATES = [
  {
    id: 'gate-1',
    gateType: 'portfolio_review',
    experimentTitle: 'Simplified mobile checkout form',
    outcomeTitle: 'Reduce Mobile Checkout Abandonment',
    question:
      'Should we proceed with this experiment portfolio? 3 hypotheses generated targeting checkout flow simplification.',
    assignedTo: 'pm@company.com',
    status: 'pending' as const,
    slaHours: 24,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

export default function GatesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Gates</h1>
        <p className="text-sm text-text-secondary mt-1">
          Human checkpoints. Every experiment needs your approval.
        </p>
      </div>

      <div className="grid gap-4">
        {DEMO_GATES.map((gate) => (
          <GateCard key={gate.id} {...gate} />
        ))}
      </div>

      {DEMO_GATES.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary text-base">Nothing waiting for your decision.</p>
        </div>
      )}
    </div>
  );
}
