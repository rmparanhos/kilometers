import { haversineM } from "./gpx";
import type { GpxPoint } from "./gpx";

export interface NormalizedRecord {
  distanceM: number;
  timeSec: number;
  hr?: number;
  speedMperS?: number;
  cadenceRpm?: number;
  elevationM?: number;
  lat?: number;
  lon?: number;
}

type FitRecord = Record<string, unknown>;

function normalizeFit(records: FitRecord[]): NormalizedRecord[] {
  if (records.length === 0) return [];

  const firstTs = records[0].timestamp
    ? new Date(records[0].timestamp as string).getTime()
    : 0;

  return records.map((r) => {
    const ts = r.timestamp ? new Date(r.timestamp as string).getTime() : 0;
    const speed =
      (r["enhanced_speed"] as number | undefined) ??
      (r["speed"] as number | undefined);
    const cadence = r["cadence"] as number | undefined;
    // fit-file-parser converts semicircles → degrees internally.
    // Records without a GPS fix carry a sentinel value outside valid ranges.
    const rawLat = r["position_lat"] as number | undefined;
    const rawLon = r["position_long"] as number | undefined;
    const lat = rawLat != null && Math.abs(rawLat) <= 90 ? rawLat : undefined;
    const lon = rawLon != null && Math.abs(rawLon) <= 180 ? rawLon : undefined;
    return {
      distanceM: (r["distance"] as number | undefined) ?? 0,
      timeSec: (ts - firstTs) / 1000,
      hr: r["heart_rate"] as number | undefined,
      speedMperS: speed,
      cadenceRpm: cadence != null ? cadence * 2 : undefined,
      elevationM:
        (r["enhanced_altitude"] as number | undefined) ??
        (r["altitude"] as number | undefined),
      lat,
      lon,
    };
  });
}

function normalizeGpx(points: GpxPoint[]): NormalizedRecord[] {
  if (points.length === 0) return [];

  const firstTime = points[0].time ? new Date(points[0].time).getTime() : 0;
  let cumulativeM = 0;

  return points.map((p, i) => {
    if (i > 0) {
      const prev = points[i - 1];
      if (
        prev["@_lat"] != null &&
        prev["@_lon"] != null &&
        p["@_lat"] != null &&
        p["@_lon"] != null
      ) {
        cumulativeM += haversineM(
          prev["@_lat"]!,
          prev["@_lon"]!,
          p["@_lat"]!,
          p["@_lon"]!
        );
      }
    }
    const ts = p.time ? new Date(p.time).getTime() : 0;
    const ext = p.extensions?.["gpxtpx:TrackPointExtension"];
    const timeSec = (ts - firstTime) / 1000;
    // Derive speed from distance delta and time delta where possible
    return {
      distanceM: cumulativeM,
      timeSec,
      hr: ext?.["gpxtpx:hr"],
      cadenceRpm: ext?.["gpxtpx:cad"],
      elevationM: p.ele,
      lat: p["@_lat"] ?? undefined,
      lon: p["@_lon"] ?? undefined,
    };
  });
}

function downsample(records: NormalizedRecord[], maxPoints: number): NormalizedRecord[] {
  if (records.length <= maxPoints) return records;
  const step = Math.ceil(records.length / maxPoints);
  const result: NormalizedRecord[] = [];
  for (let i = 0; i < records.length; i++) {
    if (i === 0 || i === records.length - 1 || i % step === 0) {
      result.push(records[i]);
    }
  }
  return result;
}

export function parseRecords(
  rawDataJson: string | null,
  sourceFormat: string | null
): NormalizedRecord[] {
  if (!rawDataJson) return [];
  try {
    const raw = JSON.parse(rawDataJson);
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const normalized =
      sourceFormat === "gpx"
        ? normalizeGpx(raw as GpxPoint[])
        : normalizeFit(raw as FitRecord[]);
    return downsample(normalized, 600);
  } catch {
    return [];
  }
}

export function parseRecordsFull(
  rawDataJson: string | null,
  sourceFormat: string | null
): NormalizedRecord[] {
  if (!rawDataJson) return [];
  try {
    const raw = JSON.parse(rawDataJson);
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return sourceFormat === "gpx"
      ? normalizeGpx(raw as GpxPoint[])
      : normalizeFit(raw as FitRecord[]);
  } catch {
    return [];
  }
}
