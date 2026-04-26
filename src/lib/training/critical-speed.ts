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
 *
 *   For runners whose activities are all longer than 50 min (e.g. recreational
 *   runners doing 10km+), we fall back to sub-effort extraction: a sliding-
 *   window search over the stored GPS/FIT trackpoints finds the best N-second
 *   segment within each bin. This lets a single long run contribute a virtual
 *   best effort at each of the standard duration targets.
 */

import type { NormalizedRecord } from "@/lib/parsers/records";

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
// Duration bins
// ---------------------------------------------------------------------------

/**
 * Duration bins (seconds) used to sample one representative effort per range.
 * Log-spaced across 3–50 min to capture the full shape of the speed-duration curve.
 */
export const DURATION_BINS: [number, number][] = [
  [180,  420],   // 3–7 min  (fast 1–2 km efforts)
  [420,  720],   // 7–12 min (2–3 km race pace)
  [720,  1080],  // 12–18 min (3–5 km race pace)
  [1080, 1680],  // 18–28 min (5–8 km race pace)
  [1680, 2400],  // 28–40 min (8–12 km race pace)
  [2400, 3000],  // 40–50 min (half-marathon effort)
];

// ---------------------------------------------------------------------------
// Sub-effort extraction from trackpoints
// ---------------------------------------------------------------------------

/**
 * Finds the best (highest average speed) contiguous segment of approximately
 * targetSec duration within the given trackpoints.
 *
 * Uses a binary-search sliding window: for each record r, finds the record l
 * whose timeSec is closest to records[r].timeSec - targetSec, then accepts
 * the window if its duration is within ±15% of targetSec.
 *
 * Returns null if no qualifying window exists (too few points or activity
 * shorter than 0.85 × targetSec).
 */
export function bestSegmentOfDuration(
  records: NormalizedRecord[],
  targetSec: number,
): CriticalSpeedEffort | null {
  if (records.length < 2) return null;

  const pts = records
    .filter((r) => r.distanceM != null && r.timeSec != null)
    .sort((a, b) => a.timeSec - b.timeSec);

  if (pts.length < 2) return null;

  const lo = targetSec * 0.85;
  const hi = targetSec * 1.15;
  let bestDist = 0;

  for (let r = 1; r < pts.length; r++) {
    const targetStart = pts[r].timeSec - targetSec;

    // Binary search for the index whose timeSec is closest to targetStart
    let left = 0;
    let right = r - 1;
    while (left < right) {
      const mid = (left + right + 1) >> 1;
      if (pts[mid].timeSec <= targetStart) left = mid;
      else right = mid - 1;
    }

    // Check left and left+1 to find the closest match
    for (const l of [left, left + 1]) {
      if (l >= r) continue;
      const dur = pts[r].timeSec - pts[l].timeSec;
      if (dur < lo || dur > hi) continue;
      const dist = pts[r].distanceM - pts[l].distanceM;
      if (dist > bestDist) bestDist = dist;
    }
  }

  return bestDist > 0 ? { durationSec: targetSec, distanceM: bestDist } : null;
}

// ---------------------------------------------------------------------------
// Pareto front extraction
// ---------------------------------------------------------------------------

/**
 * Extracts one best effort per duration bin.
 *
 * For each bin [lo, hi]:
 *   1. Considers all short activities (durationSec ∈ [lo, hi]) by full-run avg speed.
 *   2. Considers sub-efforts extracted from long activities (durationSec > 3000) whose
 *      trackpoints are provided via the `records` field — best segment of (lo+hi)/2 sec.
 *   3. Returns the faster candidate.
 *
 * This lets a 70-min recreational run contribute virtual best efforts at every
 * standard duration target, while a fast runner's hard 10km still beats the
 * easy long run's sub-efforts because it has higher average speed.
 *
 * Returns only populated bins, sorted by duration ascending.
 * fitCriticalSpeed requires at least 3 points.
 */
export function extractBestEfforts(
  activities: {
    durationSec: number;
    distanceM: number;
    avgPaceMperS?: number | null;
    records?: NormalizedRecord[];
  }[]
): CriticalSpeedEffort[] {
  const eligible = activities.filter(
    (a) => a.distanceM > 0 && a.durationSec >= 180 && a.durationSec <= 7200
  );

  const shortActivities = eligible.filter((a) => a.durationSec < 3000);
  const longWithRecords = eligible.filter(
    (a) => a.durationSec >= 3000 && a.records != null && a.records.length >= 2
  );

  const best: CriticalSpeedEffort[] = [];

  for (const [lo, hi] of DURATION_BINS) {
    const targetSec = (lo + hi) / 2;

    // Best full-run effort in this bin
    const inBin = shortActivities.filter((a) => a.durationSec >= lo && a.durationSec < hi);
    const bestShort = inBin.length > 0
      ? inBin.reduce((b, a) => a.distanceM / a.durationSec > b.distanceM / b.durationSec ? a : b)
      : null;

    // Best sub-effort at targetSec from any long activity
    let bestLong: CriticalSpeedEffort | null = null;
    for (const a of longWithRecords) {
      const seg = bestSegmentOfDuration(a.records!, targetSec);
      if (seg && (bestLong === null || seg.distanceM / seg.durationSec > bestLong.distanceM / bestLong.durationSec)) {
        bestLong = seg;
      }
    }

    // Pick the faster of the two candidates
    const winner = [bestShort, bestLong]
      .filter((c): c is CriticalSpeedEffort => c !== null)
      .reduce<CriticalSpeedEffort | null>((b, a) =>
        b === null || a.distanceM / a.durationSec > b.distanceM / b.durationSec ? a : b
      , null);

    if (winner !== null) best.push(winner);
  }

  return best.sort((a, b) => a.durationSec - b.durationSec);
}

// ---------------------------------------------------------------------------
// Model fitting
// ---------------------------------------------------------------------------

/**
 * Fits the two-parameter CS model via OLS on the best-effort points.
 * Returns null when there are too few points or physiological bounds are violated.
 *
 * Sanity bounds (all ability levels):
 *   CS:    1.5 – 6.5 m/s  (≈ 2:34 – 11:06 /km)
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

  if (cs < 1.5 || cs > 6.5)        return null;
  if (dPrime < 50 || dPrime > 600)  return null;
  if (r2 < 0.85)                    return null;

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
