/**
 * Normalizes parsed .fit or .gpx data into the ActivityInsert shape.
 *
 * Full implementation comes in Step 2 of the project roadmap.
 */
import type { ActivityInsert } from "@/lib/db/schema";

export type ParsedActivityData = {
  name?: string;
  sport?: string;
  startedAt: Date;
  durationSec: number;
  movingTimeSec?: number;
  distanceM: number;
  elevationGainM?: number;
  elevationLossM?: number;
  startLat?: number;
  startLon?: number;
  avgHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  avgCadenceRpm?: number;
  avgPaceMperS?: number;
  records?: unknown[];
};

export function normalizeToActivityInsert(
  parsed: ParsedActivityData,
  userId: string,
  opts: { sourceFile?: string; sourceFormat?: string; externalId?: string } = {}
): Omit<ActivityInsert, "id" | "createdAt"> {
  return {
    userId,
    name: parsed.name ?? null,
    sport: parsed.sport ?? "running",
    sourceFile: opts.sourceFile ?? null,
    sourceFormat: opts.sourceFormat ?? null,
    externalId: opts.externalId ?? null,
    startedAt: parsed.startedAt,
    durationSec: parsed.durationSec,
    movingTimeSec: parsed.movingTimeSec ?? null,
    distanceM: parsed.distanceM,
    elevationGainM: parsed.elevationGainM ?? null,
    elevationLossM: parsed.elevationLossM ?? null,
    startLat: parsed.startLat ?? null,
    startLon: parsed.startLon ?? null,
    avgHeartRateBpm: parsed.avgHeartRateBpm ?? null,
    maxHeartRateBpm: parsed.maxHeartRateBpm ?? null,
    avgCadenceRpm: parsed.avgCadenceRpm ?? null,
    avgPaceMperS: parsed.avgPaceMperS ?? null,
    trainingLoad: null, // computed separately after parsing
    perceivedEffort: null,
    equipmentId: null,
    rawDataJson: parsed.records ? JSON.stringify(parsed.records) : null,
  };
}
