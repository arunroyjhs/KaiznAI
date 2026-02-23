import { describe, it, expect } from 'vitest';
import {
  calculateConfidenceInterval,
  calculateRelativeLift,
} from '../statistics/confidence-interval.js';

describe('calculateConfidenceInterval', () => {
  it('returns point estimate equal to treatmentMean - controlMean', () => {
    const control = [10, 12, 11, 13, 10];
    const treatment = [15, 17, 16, 18, 15];

    const result = calculateConfidenceInterval(control, treatment);

    const controlMean = control.reduce((s, v) => s + v, 0) / control.length;
    const treatmentMean = treatment.reduce((s, v) => s + v, 0) / treatment.length;
    const expectedDelta = treatmentMean - controlMean;

    expect(result.pointEstimate).toBeCloseTo(expectedDelta, 10);
  });

  it('returns CI bounds that contain the point estimate', () => {
    const control = [10, 12, 11, 13, 10, 14, 9, 11, 12, 10];
    const treatment = [15, 17, 16, 18, 15, 19, 14, 16, 17, 15];

    const result = calculateConfidenceInterval(control, treatment);

    expect(result.lower).toBeLessThan(result.pointEstimate);
    expect(result.upper).toBeGreaterThan(result.pointEstimate);
  });

  it('defaults to confidence level of 0.95', () => {
    const control = [10, 11, 12, 13, 14];
    const treatment = [15, 16, 17, 18, 19];

    const result = calculateConfidenceInterval(control, treatment);

    expect(result.confidenceLevel).toBe(0.95);
  });

  it('uses the provided confidence level', () => {
    const control = [10, 11, 12, 13, 14];
    const treatment = [15, 16, 17, 18, 19];

    const result = calculateConfidenceInterval(control, treatment, 0.99);

    expect(result.confidenceLevel).toBe(0.99);
  });

  it('produces wider CI at higher confidence levels', () => {
    const control = [10, 12, 11, 13, 10, 14, 9, 11, 12, 10];
    const treatment = [15, 17, 16, 18, 15, 19, 14, 16, 17, 15];

    const result95 = calculateConfidenceInterval(control, treatment, 0.95);
    const result99 = calculateConfidenceInterval(control, treatment, 0.99);

    const width95 = result95.upper - result95.lower;
    const width99 = result99.upper - result99.lower;

    expect(width99).toBeGreaterThan(width95);
  });

  it('produces narrower CI at lower confidence levels', () => {
    const control = [10, 12, 11, 13, 10, 14, 9, 11, 12, 10];
    const treatment = [15, 17, 16, 18, 15, 19, 14, 16, 17, 15];

    const result90 = calculateConfidenceInterval(control, treatment, 0.90);
    const result95 = calculateConfidenceInterval(control, treatment, 0.95);

    const width90 = result90.upper - result90.lower;
    const width95 = result95.upper - result95.lower;

    expect(width90).toBeLessThan(width95);
  });

  it('returns zero-width CI when both groups have zero variance', () => {
    const control = [10, 10, 10, 10, 10];
    const treatment = [15, 15, 15, 15, 15];

    const result = calculateConfidenceInterval(control, treatment);

    expect(result.pointEstimate).toBeCloseTo(5, 10);
    expect(result.lower).toBeCloseTo(5, 10);
    expect(result.upper).toBeCloseTo(5, 10);
  });
});

describe('calculateRelativeLift', () => {
  it('returns point estimate as (treatmentMean - controlMean) / controlMean', () => {
    const control = [10, 10, 10, 10, 10];
    const treatment = [15, 15, 15, 15, 15];

    const result = calculateRelativeLift(control, treatment);

    // (15 - 10) / 10 = 0.5
    expect(result.pointEstimate).toBeCloseTo(0.5, 10);
  });

  it('returns 0 for all fields when control mean is 0', () => {
    const control = [0, 0, 0, 0, 0];
    const treatment = [15, 16, 17, 18, 19];

    const result = calculateRelativeLift(control, treatment);

    expect(result.pointEstimate).toBe(0);
    expect(result.lower).toBe(0);
    expect(result.upper).toBe(0);
  });

  it('defaults to confidence level of 0.95', () => {
    const control = [10, 11, 12, 13, 14];
    const treatment = [15, 16, 17, 18, 19];

    const result = calculateRelativeLift(control, treatment);

    expect(result.confidenceLevel).toBe(0.95);
  });

  it('returns negative relative lift when treatment is lower', () => {
    const control = [20, 20, 20, 20, 20];
    const treatment = [10, 10, 10, 10, 10];

    const result = calculateRelativeLift(control, treatment);

    // (10 - 20) / 20 = -0.5
    expect(result.pointEstimate).toBeCloseTo(-0.5, 10);
  });

  it('returns CI bounds that contain the point estimate', () => {
    const control = [10, 12, 11, 13, 10, 14, 9, 11, 12, 10];
    const treatment = [15, 17, 16, 18, 15, 19, 14, 16, 17, 15];

    const result = calculateRelativeLift(control, treatment);

    expect(result.lower).toBeLessThan(result.pointEstimate);
    expect(result.upper).toBeGreaterThan(result.pointEstimate);
  });

  it('produces different CI widths at different confidence levels', () => {
    const control = [10, 12, 11, 13, 10, 14, 9, 11, 12, 10];
    const treatment = [15, 17, 16, 18, 15, 19, 14, 16, 17, 15];

    const result90 = calculateRelativeLift(control, treatment, 0.90);
    const result99 = calculateRelativeLift(control, treatment, 0.99);

    const width90 = result90.upper - result90.lower;
    const width99 = result99.upper - result99.lower;

    expect(width99).toBeGreaterThan(width90);
  });
});
