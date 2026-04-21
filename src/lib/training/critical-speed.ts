/**
 * Critical Speed (CS) model — running equivalent of Critical Power.
 *
 * Theory:
 *   The power-duration relationship for running is hyperbolic:
 *     t_lim = D' / (v − CS)
 *   Linearised as:
 *     d = CS × t + D'
 *   where CS (m/s) is the asymptote (highest truly sustainable speed) and
 *   D' (metres) is the finite work capacity above CS ("anaerobic buffer").
 *
 * References:
 *   Monod & Scherrer (1965). Ergonomics 8:329-338. — original critical power concept.
 *   Hill D.W. (1993). Sports Medicine 16(4):237-254. — extension to running.
 *   Poole et al. (2016). Med Sci Sports Exerc 48(11):2320-2334. — definitive review.
 *   Vanhatalo, Jones & Burnley (2011). IJSPP 6(1):128-136. — practical applications.
 *   PMC7664951 — CS from raw training GPS data in recreational runners.
 *
 * Estimation strategy:
 *   Rather than requiring dedicated time trials, we derive CS from the Pareto
 *   front of recorded activities: the subset of efforts where no other run
 *   covered MORE distance in LESS time. These represent near-maximal pacing
 *   at each duration and closely approximate time-trial performance.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CriticalSpeedModel {
  cs: number;       // m/s — critical speed (the asymptote)
  dPrime: number;   // metres — anaerobic distance capacity (D')
  r2: number;       // goodness of fit (0–1); < 0.90 = low confidence
  nPoints: number;  // Pareto-front efforts used for regression
}

export interface CriticalSpeedEffort {
  durationSec: number;
  distanceM: number;
}

// ---------------------------------------------------------------------------
// Ordinary least squares — minimises residuals on the distance (y) axis
// d = CS × t + D'
// ---------------------------------------------------------------------------

function ols(pts: { t: number; d: number }[]): { slope: number; intercept: number; r2: number } | null {
  const n = pts.length;
  if (n < 2) return null;

  const sumX  = pts.reduce((s, p) => s + p.t, 0);
  const sumY  = pts.reduce((s, p) => s + p.d, 0);
  const sumXY = pts.reduce((s, p) => s + p.t * p.d, 0);
  const sumX2 = pts.reduce((s, p) => s + p.t * p.t, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY * sumX2 - sumX * sumXY) / denom;

  const yMean = sumY / n;
  const ssTot = pts.reduce((s, p) => s + (p.d - yMean) ** 2, 0);
  const ssRes = pts.reduce((s, p) => s + (p.d - (slope * p.t + intercept)) ** 2, 0);
  const r2    = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// ---------------------------------------------------------------------------
// Pareto front extraction
// ---------------------------------------------------------------------------

/**
 * Keeps only non-dominated activities: an effort A dominates B if
 * A covers >= distance in <= time (strictly in at least one dimension).
 * The front represents the fastest pace achievable at each duration.
 *
 * Duration window: 3–50 min — below 3 min the model is unreliable;
 * above 50 min, pacing conservatism causes underestimation of CS.
 */
export function extractBestEfforts(
  activities: { durationSec: number; distanceM: number; avgPaceMperS: number | null }[]
): CriticalSpeedEffort[] {
  const eligible = activities.filter(
    (a) =>
      a.durationSec >= 180 &&
      a.durationSec <= 3000 &&
      a.distanceM > 0 &&
      a.avgPaceMperS != null &&
      a.avgPaceMperS > 0
  );

  if (eligible.length < 2) return [];

  const pareto = eligible.filter((a) => {
    return !eligible.some(
      (b) =>
        b !== a &&
        b.durationSec <= a.durationSec &&
        b.distanceM >= a.distanceM &&
        (b.durationSec < a.durationSec || b.distanceM > a.distanceM)
    );
  });

  return pareto
    .map(({ durationSec, distanceM }) => ({ durationSec, distanceM }))
    .sort((a, b) => a.durationSec - b.durationSec);
}

// ---------------------------------------------------------------------------
// Model fitting
// ---------------------------------------------------------------------------

/**
 * Fits the two-parameter CS model via OLS on the Pareto-front efforts.
 * Returns null when there are too few points or physiological bounds are violated.
 *
 * Sanity bounds (trained runners):
 *   CS:    2.5 – 6.5 m/s  (≈ 2:34 – 6:40 /km)
 *   D':    50  – 600 m
 *   R²:    ≥ 0.85 (below this the data are too noisy to trust)
 *   n:     ≥ 3 points
 */
export function fitCriticalSpeed(efforts: CriticalSpeedEffort[]): CriticalSpeedModel | null {
  if (efforts.length < 3) return null;

  const pts  = efforts.map((e) => ({ t: e.durationSec, d: e.distanceM }));
  const fit  = ols(pts);
  if (!fit) return null;

  const { slope: cs, intercept: dPrime, r2 } = fit;

  if (cs < 2.5 || cs > 6.5)   return null;
  if (dPrime < 50 || dPrime > 600) return null;
  if (r2 < 0.85)               return null;

  return {
    cs:      Math.round(cs * 1000) / 1000,
    dPrime:  Math.round(dPrime),
    r2:      Math.round(r2 * 1000) / 1000,
    nPoints: efforts.length,
  };
}

// ---------------------------------------------------------------------------
// Derived calculations
// ---------------------------------------------------------------------------

/**
 * Predicted finish time (seconds) for a target distance.
 * From d = CS × t + D'  →  t = (d − D') / CS
 * Returns null for distances shorter than D' (model breaks down there).
 */
export function predictTime(model: CriticalSpeedModel, distanceM: number): number | null {
  if (distanceM <= model.dPrime) return null;
  return (distanceM - model.dPrime) / model.cs;
}

/**
 * Generates (t, pace) points for plotting the fitted hyperbola.
 * pace is in min/km (for display); t is in minutes (for display).
 *
 * v = CS + D' / t  →  pace = 1000 / (v × 60)
 */
export function hyperbolicCurve(
  model: CriticalSpeedModel,
  tMinSec = 180,
  tMaxSec = 3000,
  steps = 60
): { t: number; pace: number }[] {
  const curve: { t: number; pace: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const tSec = tMinSec + (i / steps) * (tMaxSec - tMinSec);
    const vMperS = model.cs + model.dPrime / tSec;
    curve.push({
      t: tSec / 60,
      pace: 1000 / (vMperS * 60),
    });
  }
  return curve;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Converts m/s to "M:SS /km" display string. */
export function formatCSAsPace(cs: number): string {
  const paceMinKm = 1000 / (cs * 60);
  const min = Math.floor(paceMinKm);
  const sec = Math.round((paceMinKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

/** Converts seconds to "H:MM:SS" or "M:SS" display string. */
export function formatDuration(sec: number): string {
  const h   = Math.floor(sec / 3600);
  const m   = Math.floor((sec % 3600) / 60);
  const s   = Math.round(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
