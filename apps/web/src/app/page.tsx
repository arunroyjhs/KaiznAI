import { OutcomeCard } from '../components/outcome-card';

// Demo data for Phase 0
const DEMO_OUTCOMES = [
  {
    id: 'checkout-abandonment-mobile',
    title: 'Reduce Mobile Checkout Abandonment',
    status: 'active' as const,
    signalValue: 0.32,
    targetValue: 0.45,
    targetDirection: 'increase' as const,
    experimentCount: 3,
  },
  {
    id: 'onboarding-completion',
    title: 'Improve Onboarding Completion Rate',
    status: 'draft' as const,
    signalValue: 0.61,
    targetValue: 0.80,
    targetDirection: 'increase' as const,
    experimentCount: 0,
  },
  {
    id: 'page-load-time',
    title: 'Reduce Dashboard P95 Load Time',
    status: 'achieved' as const,
    signalValue: 1.2,
    targetValue: 1.5,
    targetDirection: 'decrease' as const,
    experimentCount: 2,
    unit: 's',
  },
];

export default function OutcomesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Outcomes</h1>
          <p className="text-sm text-text-secondary mt-1">
            Define what you want to improve. The system handles the rest.
          </p>
        </div>
        <button className="px-4 py-2 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors">
          New Outcome
        </button>
      </div>

      <div className="grid gap-4">
        {DEMO_OUTCOMES.map((outcome) => (
          <OutcomeCard key={outcome.id} {...outcome} />
        ))}
      </div>

      {DEMO_OUTCOMES.length === 0 && (
        <div className="text-center py-16">
          <p className="text-text-secondary text-base">
            Define your first outcome. What metric do you need to move?
          </p>
        </div>
      )}
    </div>
  );
}
