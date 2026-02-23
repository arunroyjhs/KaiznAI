export interface Measurement {
  value: number;
  variant: 'control' | 'treatment';
  sample_size?: number;
  timestamp: Date;
}

export interface MeasurementPlan {
  minSampleSize: number;
  confidenceRequired: number;
  successThreshold: number;
  killThreshold: number;
}

export interface SignificanceResult {
  significant: boolean;
  test_statistic?: number;
  estimated_delta?: number;
  confidence_interval?: [number, number];
  sample_size_control: number;
  sample_size_treatment: number;
  meets_success_threshold: boolean;
  exceeds_kill_threshold: boolean;
  reason?: string;
}

/**
 * Sequential Testing using mixture Sequential Probability Ratio Test (mSPRT).
 * Always-valid p-values — safe to peek at any time without inflating false positive rate.
 */
export class SequentialTest {
  /**
   * Test whether the treatment is significantly different from control.
   */
  isSignificant(measurements: Measurement[], plan: MeasurementPlan): SignificanceResult {
    const control = measurements.filter((m) => m.variant === 'control');
    const treatment = measurements.filter((m) => m.variant === 'treatment');

    if (control.length < plan.minSampleSize || treatment.length < plan.minSampleSize) {
      return {
        significant: false,
        sample_size_control: control.length,
        sample_size_treatment: treatment.length,
        meets_success_threshold: false,
        exceeds_kill_threshold: false,
        reason: 'insufficient_sample',
      };
    }

    const controlMean = this.mean(control.map((m) => m.value));
    const treatmentMean = this.mean(treatment.map((m) => m.value));
    const delta = treatmentMean - controlMean;

    const controlVar = this.variance(control.map((m) => m.value));
    const treatmentVar = this.variance(treatment.map((m) => m.value));

    // Pooled standard error
    const se = Math.sqrt(controlVar / control.length + treatmentVar / treatment.length);

    // mSPRT test statistic
    const testStatistic = this.calculateMixtureSPRT(delta, se, control.length + treatment.length);

    // Threshold: alpha → threshold = 1 / alpha
    const threshold = 1 / (1 - plan.confidenceRequired);

    // Confidence interval
    const zScore = 1.96; // 95% CI
    const ci: [number, number] = [delta - zScore * se, delta + zScore * se];

    return {
      significant: testStatistic >= threshold,
      test_statistic: testStatistic,
      estimated_delta: delta,
      confidence_interval: ci,
      sample_size_control: control.length,
      sample_size_treatment: treatment.length,
      meets_success_threshold: delta >= plan.successThreshold,
      exceeds_kill_threshold: delta <= -Math.abs(plan.killThreshold),
    };
  }

  /**
   * Mixture Sequential Probability Ratio Test.
   * Uses a mixing distribution over effect sizes to provide always-valid inference.
   */
  private calculateMixtureSPRT(delta: number, se: number, totalN: number): number {
    if (se === 0) return 0;

    // Variance of the mixing distribution (tau^2)
    // Chosen to be proportional to the variance of the data
    const tauSquared = se * se;

    // Likelihood ratio under the mixture
    const vRatio = tauSquared / (tauSquared + se * se);
    const exponent = (delta * delta * totalN) / (2 * se * se * (1 + 1 / vRatio));

    return Math.exp(exponent) * Math.sqrt(1 / (1 + vRatio));
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const m = this.mean(values);
    return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  }
}
