/**
 * Calculate confidence intervals for experiment results.
 */

export interface ConfidenceIntervalResult {
  pointEstimate: number;
  lower: number;
  upper: number;
  confidenceLevel: number;
}

/**
 * Calculate a confidence interval for the difference in means between
 * control and treatment groups using a normal approximation.
 */
export function calculateConfidenceInterval(
  controlValues: number[],
  treatmentValues: number[],
  confidenceLevel: number = 0.95,
): ConfidenceIntervalResult {
  const controlMean = mean(controlValues);
  const treatmentMean = mean(treatmentValues);
  const pointEstimate = treatmentMean - controlMean;

  const controlVar = variance(controlValues);
  const treatmentVar = variance(treatmentValues);

  const se = Math.sqrt(
    controlVar / controlValues.length + treatmentVar / treatmentValues.length,
  );

  // Z-score for the confidence level
  const alpha = 1 - confidenceLevel;
  const zScore = getZScore(1 - alpha / 2);

  return {
    pointEstimate,
    lower: pointEstimate - zScore * se,
    upper: pointEstimate + zScore * se,
    confidenceLevel,
  };
}

/**
 * Calculate relative lift confidence interval.
 */
export function calculateRelativeLift(
  controlValues: number[],
  treatmentValues: number[],
  confidenceLevel: number = 0.95,
): ConfidenceIntervalResult {
  const controlMean = mean(controlValues);
  const treatmentMean = mean(treatmentValues);

  if (controlMean === 0) {
    return { pointEstimate: 0, lower: 0, upper: 0, confidenceLevel };
  }

  const relativeLift = (treatmentMean - controlMean) / controlMean;

  const controlVar = variance(controlValues);
  const treatmentVar = variance(treatmentValues);

  // Delta method for relative lift SE
  const se = Math.sqrt(
    treatmentVar / (treatmentValues.length * controlMean * controlMean) +
    controlVar * treatmentMean * treatmentMean /
      (controlValues.length * controlMean * controlMean * controlMean * controlMean),
  );

  const alpha = 1 - confidenceLevel;
  const zScore = getZScore(1 - alpha / 2);

  return {
    pointEstimate: relativeLift,
    lower: relativeLift - zScore * se,
    upper: relativeLift + zScore * se,
    confidenceLevel,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) * (v - m), 0) / (values.length - 1);
}

/**
 * Approximate inverse normal CDF (z-score lookup).
 * Uses the rational approximation from Abramowitz and Stegun.
 */
function getZScore(p: number): number {
  if (p <= 0 || p >= 1) return 0;

  // Rational approximation
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.383577518672690e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239e0;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838e0;
  const c4 = -2.549732539343734e0;
  const c5 = 4.374664141464968e0;
  const c6 = 2.938163982698783e0;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996e0;
  const d4 = 3.754408661907416e0;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
}
