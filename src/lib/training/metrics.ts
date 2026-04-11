/**
 * CTL / ATL / TSB calculations — Banister Performance Manager Chart (PMC) model
 *
 * Definitions:
 *   CTL  — Chronic Training Load  (fitness)  — 42-day EWA of daily load
 *   ATL  — Acute Training Load    (fatigue)  — 7-day EWA of daily load
 *   TSB  — Training Stress Balance (form)    = CTL − ATL
 *
 * All functions are pure and have no DB dependency so they're trivially testable.
 */
import { addDays, startOfDay, format, isAfter } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyLoad {
  date: Date;
  load: number;
}

export interface FormPoint {
  date: Date;
  dateLabel: string; // pre-formatted for chart X axis (YYYY-MM-DD)
  ctl: number;
  atl: number;
  tsb: number;
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

  return loads.map(({ date, load }) => {
    ctl = ctl + (load - ctl) * CTL_DECAY;
    atl = atl + (load - atl) * ATL_DECAY;
    return {
      date,
      dateLabel: format(date, "yyyy-MM-dd"),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
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
  activities: { startedAt: Date; trainingLoad: number | null }[],
  endDate: Date = new Date()
): DailyLoad[] {
  if (activities.length === 0) return [];

  // Aggregate by calendar day
  const byDay = new Map<string, number>();
  for (const act of activities) {
    const key = format(startOfDay(act.startedAt), "yyyy-MM-dd");
    byDay.set(key, (byDay.get(key) ?? 0) + (act.trainingLoad ?? 0));
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
    result.push({ date: current, load: byDay.get(key) ?? 0 });
    current = addDays(current, 1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Training load estimation
// ---------------------------------------------------------------------------

/**
 * Estimates hrTSS for a single activity.
 *
 * Uses a simplified TRIMP-like formula: (hours × HR ratio) × 100
 * Replace with Banister's exponential once LTHR is calibrated per user.
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
  const hrRatio = avgHrBpm / lthrBpm;
  return Math.round(durationHours * hrRatio * 100 * 10) / 10;
}

/**
 * Fallback training load estimate when HR data is unavailable.
 * Uses duration only, assuming a moderate effort of 60 TSS/hour.
 */
export function estimateLoadFromDuration(durationSec: number): number {
  const durationHours = durationSec / 3600;
  return Math.round(durationHours * 60 * 10) / 10;
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
    label: "Pico de forma",
    advice: "Momento ideal para competição ou sessão de qualidade máxima.",
  },
  fresh: {
    label: "Em forma",
    advice: "Pronto para treinos de qualidade — carga controlada.",
  },
  neutral: {
    label: "Neutro",
    advice: "Equilíbrio entre fitness e fadiga — carga sustentável.",
  },
  fatigued: {
    label: "Fadigado",
    advice: "Fadiga acumulada — considere uma semana de recuperação.",
  },
  overreached: {
    label: "Sobrecarga",
    advice: "Reduza a carga imediatamente para evitar lesão.",
  },
};
