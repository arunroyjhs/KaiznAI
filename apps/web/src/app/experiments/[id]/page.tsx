import { SignalChart } from '../../../components/signal-chart';
import { SignificanceMeter } from '../../../components/significance-meter';
import { ResultSummary } from '../../../components/result-summary';

// Demo time-series data
const DEMO_SIGNAL_DATA = Array.from({ length: 21 }, (_, i) => {
  const day = i;
  const baseControl = 0.32;
  const baseTreatment = 0.32;
  const noise = () => (Math.random() - 0.5) * 0.02;

  const treatmentLift = day > 5 ? Math.min((day - 5) * 0.005, 0.06) : 0;

  return {
    time: `Day ${day}`,
    control: baseControl + noise(),
    treatment: baseTreatment + treatmentLift + noise(),
    ciLower: baseTreatment + treatmentLift - 0.03,
    ciUpper: baseTreatment + treatmentLift + 0.03,
  };
});

export default function ExperimentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs text-text-muted mb-1">Experiment {params.id}</p>
        <h1 className="text-2xl font-semibold text-text-primary">
          Simplified Mobile Checkout Form
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Reducing the checkout form from 5 steps to 3 steps will increase
          completion by removing friction points.
        </p>
      </div>

      <div className="grid gap-6">
        <SignalChart
          data={DEMO_SIGNAL_DATA}
          targetValue={0.45}
          killThreshold={0.28}
          baselineValue={0.32}
          launchDate="Day 5"
          title="Checkout Completion Rate — Control vs Treatment"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SignificanceMeter value={0.72} threshold={0.95} />
          <ResultSummary
            delta={0.04}
            ciLower={0.01}
            ciUpper={0.07}
            pValue={0.034}
            sampleSizeControl={1247}
            sampleSizeTreatment={1302}
            isSignificant={false}
            direction="increase"
          />
        </div>
      </div>
    </div>
  );
}
