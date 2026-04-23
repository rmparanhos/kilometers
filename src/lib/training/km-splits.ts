import type { NormalizedRecord } from "@/lib/parsers/records";

export interface KmSplit {
  km: number;
  splitTimeSec: number;  // time to run this km
  cumTimeSec: number;    // elapsed time at end of this km
}

function timeAtDistance(sorted: NormalizedRecord[], targetM: number): number {
  let lo = 0;
  let hi = sorted.length - 1;

  if (targetM <= sorted[0].distanceM) return sorted[0].timeSec;
  if (targetM >= sorted[hi].distanceM) return sorted[hi].timeSec;

  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid].distanceM < targetM) lo = mid;
    else hi = mid;
  }

  const r0 = sorted[lo];
  const r1 = sorted[hi];
  if (r1.distanceM === r0.distanceM) return r0.timeSec;
  const t = (targetM - r0.distanceM) / (r1.distanceM - r0.distanceM);
  return r0.timeSec + t * (r1.timeSec - r0.timeSec);
}

export function interpolateKmSplits(records: NormalizedRecord[]): KmSplit[] {
  if (records.length < 2) return [];

  const sorted = [...records].sort((a, b) => a.distanceM - b.distanceM);
  const totalM = sorted[sorted.length - 1].distanceM;
  const numKms = Math.floor(totalM / 1000);
  if (numKms < 1) return [];

  const startTime = timeAtDistance(sorted, 0);
  const result: KmSplit[] = [];
  let prevCum = 0;

  for (let km = 1; km <= numKms; km++) {
    const cumTimeSec = timeAtDistance(sorted, km * 1000) - startTime;
    result.push({
      km,
      splitTimeSec: cumTimeSec - prevCum,
      cumTimeSec,
    });
    prevCum = cumTimeSec;
  }

  return result;
}
