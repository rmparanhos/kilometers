/**
 * CTL / ATL / TSB calculations — Banister impulse–response model
 *
 * Definitions:
 *   CTL  — Chronic Training Load  (fitness)  — 42-day EWA of daily training load
 *   ATL  — Acute Training Load    (fatigue)  — 7-day EWA of daily training load
 *   TSB  — Training Stress Balance (form)    = CTL − ATL
 *
 * References:
 *   Morton, R.H., Fitz-Clarke, J.R. & Banister, E.W. (1990). Modeling human
 *     performance in running. Journal of Applied Physiology, 69(3), 1171–1177.
 *     https://doi.org/10.1152/jappl.1990.69.3.1171
 *
 *   Coggan, A.R. (2003). Training and racing with a power meter. Peaks Coaching
 *     Group. [popularised TSS/CTL/ATL nomenclature in endurance sports]
 *
 * All functions are pure and have no DB dependency so they are trivially testable.
 */
import { addDays, startOfDay, format, isAfter } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyLoad {
  date: Date;
  load: number;
  distanceM?: number;
  durationSec?: number;
}

export interface FormPoint {
  date: Date;
  dateLabel: string; // pre-formatted for chart X axis (YYYY-MM-DD)
  ctl: number;
  atl: number;
  tsb: number;
  hasActivity: boolean;    // true when daily training load > 0
  distanceM?: number;      // total distance for the day (sum across activities)
  durationSec?: number;    // total duration for the day
  avgPaceMperS?: number;   // derived: distanceM / durationSec
}

// Contextual zone based on TSB
export type FormZone =
  | "peak"       // TSB > 10
  | "fresh"      // 0 < TSB ≤ 10
  | "neutral"    // -10 < TSB ≤ 0
  | "fatigued"   // -30 < TSB ≤ -10
  | "overreached"; // TSB ≤ -30

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CTL_DECAY = 1 / 42;
const ATL_DECAY = 1 / 7;

// ---------------------------------------------------------------------------
// Core PMC calculation
// ---------------------------------------------------------------------------

/**
 * Computes the PMC series from an ordered list of daily load values.
 *
 * @param loads  Daily loads sorted ascending by date. Rest days must be
 *               represented as entries with load = 0 (use fillGaps first).
 */
export function computeFormSeries(loads: DailyLoad[]): FormPoint[] {
  let ctl = 0;
  let atl = 0;

  return loads.map(({ date, load, distanceM, durationSec }) => {
    ctl = ctl + (load - ctl) * CTL_DECAY;
    atl = atl + (load - atl) * ATL_DECAY;
    const avgPaceMperS =
      distanceM && durationSec && durationSec > 0
        ? distanceM / durationSec
        : undefined;
    return {
      date,
      dateLabel: format(date, "yyyy-MM-dd"),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
      hasActivity: load > 0,
      distanceM: distanceM ?? undefined,
      durationSec: durationSec ?? undefined,
      avgPaceMperS,
    };
  });
}

// ---------------------------------------------------------------------------
// Gap filling
// ---------------------------------------------------------------------------

/**
 * Converts a sparse list of activities into a contiguous daily load series,
 * filling rest days with load = 0. Multiple activities on the same day are summed.
 *
 * @param activities  Activities sorted by startedAt (any order is fine — sorted internally)
 * @param endDate     Last date to include (defaults to today)
 */
export function fillGaps(
  activities: {
    startedAt: Date;
    trainingLoad: number | null;
    distanceM?: number | null;
    durationSec?: number | null;
  }[],
  endDate: Date = new Date()
): DailyLoad[] {
  if (activities.length === 0) return [];

  // Aggregate by calendar day
  const byDay = new Map<string, { load: number; distanceM: number; durationSec: number }>();
  for (const act of activities) {
    const key = format(startOfDay(act.startedAt), "yyyy-MM-dd");
    const prev = byDay.get(key) ?? { load: 0, distanceM: 0, durationSec: 0 };
    byDay.set(key, {
      load: prev.load + (act.trainingLoad ?? 0),
      distanceM: prev.distanceM + (act.distanceM ?? 0),
      durationSec: prev.durationSec + (act.durationSec ?? 0),
    });
  }

  // Determine range
  const sorted = [...activities].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
  );
  const first = startOfDay(sorted[0].startedAt);
  const end = startOfDay(endDate);

  // Walk day by day
  const result: DailyLoad[] = [];
  let current = first;
  while (!isAfter(current, end)) {
    const key = format(current, "yyyy-MM-dd");
    const day = byDay.get(key);
    result.push(
      day
        ? { date: current, load: day.load, distanceM: day.distanceM, durationSec: day.durationSec }
        : { date: current, load: 0 }
    );
    current = addDays(current, 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Training load estimation
// ---------------------------------------------------------------------------

/**
 * Banister TRIMP (Training Impulse) — the original impulse–response model.
 *
 * Reference:
 *   Banister, E.W. (1991). Modeling elite athletic performance. In H.J. Green,
 *   J.D. McDougal & H. Wenger (Eds.), Physiological Testing of Elite Athletes
 *   (pp. 403–424). Human Kinetics.
 *
 * Formula:
 *   TRIMP = duration_min × HRr × 0.64 × e^(1.92 × HRr)
 *   HRr   = (avgHR − HRrest) / (HRmax − HRrest)   [Karvonen heart rate reserve]
 *
 * The exponential component reflects the non-linear metabolic cost of
 * high-intensity exercise (lactate, catecholamines). Constant 0.64 and
 * exponent 1.92 are empirical fits from Banister's original data (men).
 *
 * @param durationSec  Duration in seconds
 * @param avgHrBpm     Average heart rate in bpm
 * @param hrMax        Maximum heart rate in bpm
 * @param hrRest       Resting heart rate in bpm
 */
export function estimateBanisterTRIMP(
  durationSec: number,
  avgHrBpm: number,
  hrMax: number,
  hrRest: number
): number {
  const durationMin = durationSec / 60;
  const hrr = Math.max(0, Math.min(1, (avgHrBpm - hrRest) / (hrMax - hrRest)));
  return Math.round(durationMin * hrr * 0.64 * Math.exp(1.92 * hrr) * 10) / 10;
}

/**
 * Simplified linear hrTSS — a practical approximation for use when only
 * lactate threshold HR is known (no HRmax/HRrest).
 *
 * Reference:
 *   Manzi, V. et al. (2009). Dose-response relationship of autonomic nervous
 *   system responses to individualized training impulse in marathon runners.
 *   American Journal of Physiology, 296(6), H1733–H1740.
 *   https://doi.org/10.1152/ajpheart.00054.2009
 *
 * Formula: load = duration_hours × (avgHR / LTHR) × 100
 * A 1-hour effort at exactly LTHR scores 100 — analogous to Coggan's TSS
 * definition for cycling power.
 *
 * @param durationSec  Duration in seconds
 * @param avgHrBpm     Average heart rate in bpm
 * @param lthrBpm      Lactate threshold HR (default: 170 bpm)
 */
export function estimateHrTSS(
  durationSec: number,
  avgHrBpm: number,
  lthrBpm = 170
): number {
  const durationHours = durationSec / 3600;
  return Math.round(durationHours * (avgHrBpm / lthrBpm) * 100 * 10) / 10;
}

/**
 * Fallback training load estimate when no HR data is available.
 * Assumes a moderate aerobic effort of 60 TSS/hour.
 */
export function estimateLoadFromDuration(durationSec: number): number {
  return Math.round((durationSec / 3600) * 60 * 10) / 10;
}

/**
 * User heart rate profile — drives model selection in estimateTrainingLoad.
 */
export interface HrProfile {
  hrMax?: number | null;
  hrRest?: number | null;
  lthrBpm?: number | null;
}

/** Which calculation model was used for a given activity's training load. */
export type LoadModel = "banister" | "hr_tss" | "duration";

/**
 * Smart training load selector — returns load and the model used.
 *
 * Priority:
 *   1. Banister TRIMP (1991)  — when avgHR + hrMax + hrRest are all known
 *   2. Linear hrTSS (Manzi)   — when avgHR is known (uses lthrBpm or 170 default)
 *   3. Duration fallback       — when no HR data is available
 */
export function estimateTrainingLoadWithModel(
  durationSec: number,
  avgHrBpm: number | null | undefined,
  profile: HrProfile = {}
): { load: number; model: LoadModel } {
  if (avgHrBpm != null && profile.hrMax && profile.hrRest) {
    return {
      load: estimateBanisterTRIMP(durationSec, avgHrBpm, profile.hrMax, profile.hrRest),
      model: "banister",
    };
  }
  if (avgHrBpm != null) {
    return {
      load: estimateHrTSS(durationSec, avgHrBpm, profile.lthrBpm ?? 170),
      model: "hr_tss",
    };
  }
  return { load: estimateLoadFromDuration(durationSec), model: "duration" };
}

/** Convenience wrapper — returns only the numeric load. */
export function estimateTrainingLoad(
  durationSec: number,
  avgHrBpm: number | null | undefined,
  profile: HrProfile = {}
): number {
  return estimateTrainingLoadWithModel(durationSec, avgHrBpm, profile).load;
}

// ---------------------------------------------------------------------------
// Contextual interpretation
// ---------------------------------------------------------------------------

export function getFormZone(tsb: number): FormZone {
  if (tsb > 10) return "peak";
  if (tsb > 0) return "fresh";
  if (tsb > -10) return "neutral";
  if (tsb > -30) return "fatigued";
  return "overreached";
}

export const ZONE_LABELS: Record<FormZone, { label: string; advice: string }> = {
  peak: {
    label: "Peak form",
    advice: "Optimal window for racing or maximum-quality sessions (TSB > 10).",
  },
  fresh: {
    label: "Fresh",
    advice: "Ready for quality work — maintain controlled load (0 < TSB ≤ 10).",
  },
  neutral: {
    label: "Neutral",
    advice: "Fitness and fatigue in balance — load is sustainable (−10 < TSB ≤ 0).",
  },
  fatigued: {
    label: "Optimal load",
    advice: "Prime adaptation window — fitness is being built; monitor recovery closely (−30 < TSB ≤ −10).",
  },
  overreached: {
    label: "High risk",
    advice: "Reduce load immediately — overtraining and injury risk are elevated (TSB ≤ −30).",
  },
};

// ---------------------------------------------------------------------------
// VO2max estimation
// ---------------------------------------------------------------------------

/**
 * Estimates VO2max (mL/kg/min) from a submaximal running effort using:
 *
 * 1. ACSM oxygen cost of level running:
 *      VO2_run = 0.2 × speed_m/min + 3.5
 *    American College of Sports Medicine (2010). ACSM's Guidelines for Exercise
 *    Testing and Prescription (8th ed.). Lippincott Williams & Wilkins.
 *
 * 2. %HRR ≈ %VO2max (Swain et al., 1994):
 *      %HRR = (avgHR − HRrest) / (HRmax − HRrest)
 *    Swain, D.P. et al. (1994). Target HR for the development of cardiovascular
 *    fitness. Medicine & Science in Sports & Exercise, 26(1), 112–116.
 *    https://doi.org/10.1249/00005768-199401000-00019
 *
 * Reliability is highest at submaximal efforts (HRR 50–90 %). Returns null
 * when inputs are invalid or HRR is outside the reliable range.
 *
 * @param speedMperS   Average running speed in m/s
 * @param avgHrBpm     Average heart rate during the effort (bpm)
 * @param hrMax        Maximum heart rate (bpm)
 * @param hrRest       Resting heart rate (bpm)
 */
export function estimateVO2maxFromRun(
  speedMperS: number,
  avgHrBpm: number,
  hrMax: number,
  hrRest: number
): number | null {
  if (hrMax <= hrRest || avgHrBpm <= hrRest || avgHrBpm >= hrMax) return null;

  const speedMperMin = speedMperS * 60;
  const vo2Run = 0.2 * speedMperMin + 3.5; // mL/kg/min

  const hrr = (avgHrBpm - hrRest) / (hrMax - hrRest); // fraction 0–1
  if (hrr < 0.4 || hrr > 0.97) return null; // outside reliable submaximal range

  const vo2max = vo2Run / hrr;
  return Math.round(vo2max * 10) / 10;
}

// ---------------------------------------------------------------------------
// VO2max time series
// ---------------------------------------------------------------------------

export interface Vo2maxPoint {
  date: Date;
  dateLabel: string;
  vo2max: number;
}

/**
 * Returns one VO2max estimate per activity (filtered to valid submaximal
 * efforts), sorted ascending by date. Used to plot VO2max evolution over time.
 */
export function computeVo2maxSeries(
  acts: {
    startedAt: Date;
    avgPaceMperS: number | null;
    avgHeartRateBpm: number | null;
    durationSec: number;
    distanceM: number;
  }[],
  profile: HrProfile
): Vo2maxPoint[] {
  if (!profile.hrMax || !profile.hrRest) return [];

  const points: Vo2maxPoint[] = [];
  for (const act of acts) {
    if (!act.avgPaceMperS || !act.avgHeartRateBpm) continue;
    if (act.durationSec < 600) continue;
    const vo2max = estimateVO2maxFromRun(
      act.avgPaceMperS,
      act.avgHeartRateBpm,
      profile.hrMax,
      profile.hrRest
    );
    if (vo2max != null) {
      points.push({
        date: act.startedAt,
        dateLabel: format(act.startedAt, "yyyy-MM-dd"),
        vo2max,
      });
    }
  }

  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Derives a best VO2max estimate from a list of running activities.
 * Takes the 90th-percentile estimate across all valid efforts (highest
 * credible value, not an outlier from sensor noise).
 */
export function bestVO2maxEstimate(
  acts: {
    avgPaceMperS: number | null;
    avgHeartRateBpm: number | null;
    distanceM: number;
    durationSec: number;
  }[],
  profile: HrProfile
): number | null {
  if (!profile.hrMax || !profile.hrRest) return null;

  const estimates: number[] = [];
  for (const act of acts) {
    if (!act.avgPaceMperS || !act.avgHeartRateBpm) continue;
    if (act.durationSec < 600) continue; // ignore efforts < 10 min (unreliable)
    const est = estimateVO2maxFromRun(
      act.avgPaceMperS,
      act.avgHeartRateBpm,
      profile.hrMax,
      profile.hrRest
    );
    if (est != null) estimates.push(est);
  }

  if (estimates.length === 0) return null;
  estimates.sort((a, b) => a - b);
  // 90th percentile (rounds down for small arrays)
  const idx = Math.min(
    Math.floor(estimates.length * 0.9),
    estimates.length - 1
  );
  return estimates[idx];
}
