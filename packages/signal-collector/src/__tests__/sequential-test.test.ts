import { describe, it, expect } from 'vitest';
import {
  SequentialTest,
  type Measurement,
  type MeasurementPlan,
} from '../statistics/sequential-test.js';

function makeMeasurements(
  controlValues: number[],
  treatmentValues: number[],
): Measurement[] {
  const now = new Date();
  const measurements: Measurement[] = [];
  for (const value of controlValues) {
    measurements.push({ value, variant: 'control', timestamp: now });
  }
  for (const value of treatmentValues) {
    measurements.push({ value, variant: 'treatment', timestamp: now });
  }
  return measurements;
}

const defaultPlan: MeasurementPlan = {
  minSampleSize: 10,
  confidenceRequired: 0.95,
  successThreshold: 0.05,
  killThreshold: 0.05,
};

describe('SequentialTest', () => {
  const test = new SequentialTest();

  describe('insufficient sample', () => {
    it('returns insufficient_sample when control is below minSampleSize', () => {
      const measurements = makeMeasurements(
        [1, 2, 3], // only 3 control samples, need 10
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      );

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.significant).toBe(false);
      expect(result.reason).toBe('insufficient_sample');
      expect(result.meets_success_threshold).toBe(false);
      expect(result.exceeds_kill_threshold).toBe(false);
      expect(result.sample_size_control).toBe(3);
      expect(result.sample_size_treatment).toBe(10);
    });

    it('returns insufficient_sample when treatment is below minSampleSize', () => {
      const measurements = makeMeasurements(
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        [1, 2], // only 2 treatment samples, need 10
      );

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.significant).toBe(false);
      expect(result.reason).toBe('insufficient_sample');
      expect(result.sample_size_control).toBe(10);
      expect(result.sample_size_treatment).toBe(2);
    });

    it('returns insufficient_sample when both groups are below minSampleSize', () => {
      const measurements = makeMeasurements([1], [2]);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.significant).toBe(false);
      expect(result.reason).toBe('insufficient_sample');
    });

    it('does not include test_statistic or estimated_delta for insufficient sample', () => {
      const measurements = makeMeasurements([1, 2], [3, 4]);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.test_statistic).toBeUndefined();
      expect(result.estimated_delta).toBeUndefined();
      expect(result.confidence_interval).toBeUndefined();
    });
  });

  describe('clear positive effect', () => {
    it('returns significant=true and meets_success_threshold=true when treatment >> control', () => {
      // Control mean ~10, treatment mean ~20, large clear effect
      const control = Array.from({ length: 100 }, () => 10 + (Math.random() - 0.5) * 0.5);
      const treatment = Array.from({ length: 100 }, () => 20 + (Math.random() - 0.5) * 0.5);
      const measurements = makeMeasurements(control, treatment);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.significant).toBe(true);
      expect(result.meets_success_threshold).toBe(true);
      expect(result.exceeds_kill_threshold).toBe(false);
      expect(result.estimated_delta).toBeGreaterThan(0);
    });
  });

  describe('clear negative effect', () => {
    it('returns exceeds_kill_threshold=true when treatment << control', () => {
      // Control mean ~20, treatment mean ~10, large negative effect
      const control = Array.from({ length: 100 }, () => 20 + (Math.random() - 0.5) * 0.5);
      const treatment = Array.from({ length: 100 }, () => 10 + (Math.random() - 0.5) * 0.5);
      const measurements = makeMeasurements(control, treatment);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.exceeds_kill_threshold).toBe(true);
      expect(result.estimated_delta).toBeLessThan(0);
    });
  });

  describe('no difference', () => {
    it('returns significant=false when control and treatment are identical', () => {
      const values = Array.from({ length: 50 }, () => 10);
      const measurements = makeMeasurements(values, [...values]);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.significant).toBe(false);
      expect(result.meets_success_threshold).toBe(false);
      expect(result.exceeds_kill_threshold).toBe(false);
    });
  });

  describe('correct sample sizes', () => {
    it('returns the correct number of control and treatment samples', () => {
      const controlValues = Array.from({ length: 25 }, (_, i) => i);
      const treatmentValues = Array.from({ length: 30 }, (_, i) => i);
      const measurements = makeMeasurements(controlValues, treatmentValues);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.sample_size_control).toBe(25);
      expect(result.sample_size_treatment).toBe(30);
    });
  });

  describe('estimated_delta', () => {
    it('returns estimated_delta equal to treatmentMean - controlMean', () => {
      // Control: all 10s, Treatment: all 15s
      const control = Array.from({ length: 20 }, () => 10);
      const treatment = Array.from({ length: 20 }, () => 15);
      const measurements = makeMeasurements(control, treatment);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.estimated_delta).toBeCloseTo(5, 10);
    });

    it('returns negative estimated_delta when treatment is lower', () => {
      const control = Array.from({ length: 20 }, () => 15);
      const treatment = Array.from({ length: 20 }, () => 10);
      const measurements = makeMeasurements(control, treatment);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.estimated_delta).toBeCloseTo(-5, 10);
    });
  });

  describe('confidence interval', () => {
    it('returns confidence interval bounds that contain the point estimate', () => {
      const control = Array.from({ length: 50 }, () => 10 + (Math.random() - 0.5) * 2);
      const treatment = Array.from({ length: 50 }, () => 12 + (Math.random() - 0.5) * 2);
      const measurements = makeMeasurements(control, treatment);

      const result = test.isSignificant(measurements, defaultPlan);

      expect(result.confidence_interval).toBeDefined();
      const [lower, upper] = result.confidence_interval!;
      expect(lower).toBeLessThan(result.estimated_delta!);
      expect(upper).toBeGreaterThan(result.estimated_delta!);
    });

    it('has confidence interval that is symmetric around the estimated delta', () => {
      const control = Array.from({ length: 30 }, () => 10);
      const treatment = Array.from({ length: 30 }, () => 15);
      const measurements = makeMeasurements(control, treatment);

      const result = test.isSignificant(measurements, defaultPlan);

      const [lower, upper] = result.confidence_interval!;
      const delta = result.estimated_delta!;
      const distLower = delta - lower;
      const distUpper = upper - delta;
      expect(distLower).toBeCloseTo(distUpper, 10);
    });

    it('returns narrower confidence interval with more samples', () => {
      const controlSmall = Array.from({ length: 20 }, () => 10 + (Math.random() - 0.5));
      const treatmentSmall = Array.from({ length: 20 }, () => 12 + (Math.random() - 0.5));
      const measurementsSmall = makeMeasurements(controlSmall, treatmentSmall);

      const controlLarge = Array.from({ length: 500 }, () => 10 + (Math.random() - 0.5));
      const treatmentLarge = Array.from({ length: 500 }, () => 12 + (Math.random() - 0.5));
      const measurementsLarge = makeMeasurements(controlLarge, treatmentLarge);

      const resultSmall = test.isSignificant(measurementsSmall, defaultPlan);
      const resultLarge = test.isSignificant(measurementsLarge, defaultPlan);

      const widthSmall = resultSmall.confidence_interval![1] - resultSmall.confidence_interval![0];
      const widthLarge = resultLarge.confidence_interval![1] - resultLarge.confidence_interval![0];

      expect(widthLarge).toBeLessThan(widthSmall);
    });
  });
});
