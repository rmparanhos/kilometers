/**
 * .fit file parser wrapper
 *
 * Wraps `fit-file-parser` and normalizes the output into ParsedActivityData.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FitParser = require("fit-file-parser").default;
import type { ParsedActivityData } from "./normalize";

// ---------------------------------------------------------------------------
// Types — minimal subset of fit-file-parser's internal ParsedFit
// The package doesn't re-export its type from the main entry point, so we
// define what we actually need here.
// ---------------------------------------------------------------------------

type FitRecord = Record<string, unknown>;

interface FitSession extends Record<string, unknown> {
  timestamp?: string | Date;
  start_time?: Date;
  sport?: string;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_ascent?: number;
  total_descent?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  // Newer Garmin devices write enhanced_* instead of the base field
  avg_speed?: number;
  enhanced_avg_speed?: number;
  // Running dynamics (Garmin Running Power / Advanced Running Dynamics)
  avg_vertical_oscillation?: number;
  avg_stance_time?: number;
  avg_step_length?: number;
  avg_vertical_ratio?: number;
  normalized_power?: number;
  total_calories?: number;
}

export interface ParsedFit {
  protocolVersion: number;
  profileVersion: number;
  user_profile: FitRecord;
  activity: {
    timestamp?: string | Date;
    sessions?: FitSession[];
    [key: string]: unknown;
  };
  sessions?: FitSession[];
  records?: FitRecord[];
  laps?: FitRecord[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function createParser() {
  return new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
    mode: "both",
  });
}

export async function parseFitBuffer(buffer: Buffer): Promise<ParsedFit> {
  return createParser().parseAsync(buffer) as Promise<ParsedFit>;
}

/**
 * Extracts a normalized activity summary from a parsed .fit file.
 *
 * Reads from top-level `sessions` (populated in 'both' mode) and top-level
 * `records`. All speed/distance values come pre-converted to m/s and meters
 * by the parser options above.
 */
export function extractActivityFromFit(data: ParsedFit): ParsedActivityData {
  // In 'both' mode, sessions appear at top-level and inside activity
  const session: FitSession | undefined =
    data.sessions?.[0] ?? data.activity?.sessions?.[0];

  if (!session) {
    throw new Error("No session found in .fit file");
  }

  const records = data.records ?? [];

  // start_time is the session start; fall back to the session timestamp field
  const startRaw = session.start_time ?? session.timestamp;
  const startedAt = startRaw instanceof Date ? startRaw : new Date(String(startRaw));

  // Newer Garmin devices write enhanced_avg_speed instead of avg_speed.
  // Fall back to computing from distance/time if neither is present.
  const speedMperS: number | undefined =
    (session["enhanced_avg_speed"] as number | undefined) ??
    session.avg_speed ??
    (session.total_distance && session.total_elapsed_time
      ? session.total_distance / session.total_elapsed_time
      : undefined);

  // FIT running cadence is revolutions/min per leg — multiply by 2 for total spm.
  const avgCadenceRpm: number | undefined =
    session.avg_cadence != null
      ? session.avg_cadence * 2
      : undefined;

  // Session-level start position is the most reliable source.
  // Fall back to first record that has a valid GPS fix (|lat| ≤ 90°).
  // records without GPS lock have the sentinel value 0x7FFFFFFF which
  // converts to ~180° — well outside the valid latitude range.
  const sessionLat = session["start_position_lat"] as number | undefined;
  const sessionLon = session["start_position_long"] as number | undefined;

  const firstGpsRecord = records.find(
    (r) =>
      r["position_lat"] != null &&
      Math.abs(r["position_lat"] as number) <= 90
  );

  const startLat =
    sessionLat != null && Math.abs(sessionLat) <= 90
      ? sessionLat
      : (firstGpsRecord?.["position_lat"] as number | undefined);
  const startLon =
    sessionLon != null && Math.abs(sessionLon) <= 180
      ? sessionLon
      : (firstGpsRecord?.["position_long"] as number | undefined);

  return {
    name: session.sport ? String(session.sport) : undefined,
    sport: session.sport?.toLowerCase() ?? "running",
    startedAt,
    durationSec: session.total_elapsed_time ?? 0,
    movingTimeSec: session.total_timer_time,
    distanceM: session.total_distance ?? 0,
    elevationGainM: session.total_ascent,
    elevationLossM: session.total_descent,
    startLat,
    startLon,
    avgHeartRateBpm: session.avg_heart_rate,
    maxHeartRateBpm: session.max_heart_rate,
    avgCadenceRpm,
    avgPaceMperS: speedMperS,
    records: records.length > 0 ? records : undefined,
  };
}
