/**
 * CTL / ATL / TSB calculations (Banister Performance Manager Chart model)
 *
 * Full implementation and validation against Intervals.icu comes in Step 3.
 *
 * Definitions:
 *   CTL  — Chronic Training Load  (fitness),  42-day exponential weighted average of daily load
 *   ATL  — Acute Training Load    (fatigue),   7-day exponential weighted average of daily load
 *   TSB  — Training Stress Balance (form) = CTL - ATL
 */

export interface DailyLoad {
  date: Date;
  load: number; // hrTSS or TRIMP value for that day
}

export interface FormPoint {
  date: Date;
  ctl: number;
  atl: number;
  tsb: number;
}

const CTL_DECAY = 1 / 42;
const ATL_DECAY = 1 / 7;

/**
 * Computes the PMC (Performance Manager Chart) series from an ordered list of
 * daily training load values.
 *
 * @param loads  Daily loads sorted ascending by date. Gaps (rest days) must be
 *               represented as entries with load = 0.
 */
export function computeFormSeries(loads: DailyLoad[]): FormPoint[] {
  let ctl = 0;
  let atl = 0;

  return loads.map(({ date, load }) => {
    ctl = ctl + (load - ctl) * CTL_DECAY;
    atl = atl + (load - atl) * ATL_DECAY;
    const tsb = ctl - atl;
    return { date, ctl, atl, tsb };
  });
}

/**
 * Estimates hrTSS (heart rate Training Stress Score) for a single activity.
 *
 * hrTSS = (duration_hours * avg_hr * duration_hours) / (LTHR * 3600) * 100
 *
 * A simpler TRIMP formula is used as a placeholder until LTHR calibration
 * is implemented in the user profile.
 *
 * @param durationSec  Activity duration in seconds
 * @param avgHrBpm     Average heart rate in bpm
 * @param lthrBpm      Lactate threshold heart rate in bpm (default: 170)
 */
export function estimateHrTSS(
  durationSec: number,
  avgHrBpm: number,
  lthrBpm = 170
): number {
  const durationHours = durationSec / 3600;
  const hrRatio = avgHrBpm / lthrBpm;
  // Simplified TRIMP-like formula; replace with Banister's exponential once LTHR is set
  return durationHours * hrRatio * 100;
}
