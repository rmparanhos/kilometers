/**
 * .gpx file parser wrapper
 *
 * Parses GPX XML and extracts a normalized activity summary.
 */
import { XMLParser } from "fast-xml-parser";
import type { ParsedActivityData } from "./normalize";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GpxData {
  gpx?: {
    trk?: GpxTrack | GpxTrack[];
    metadata?: { name?: string; time?: string };
  };
}

export interface GpxTrack {
  name?: string;
  trkseg?: GpxSegment | GpxSegment[];
}

export interface GpxSegment {
  trkpt?: GpxPoint | GpxPoint[];
}

export interface GpxPoint {
  "@_lat"?: number;
  "@_lon"?: number;
  ele?: number;
  time?: string;
  extensions?: {
    "gpxtpx:TrackPointExtension"?: {
      "gpxtpx:hr"?: number;
      "gpxtpx:cad"?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function parseGpxString(xml: string): GpxData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
    isArray: (name) => ["trkpt", "trk", "trkseg"].includes(name),
  });
  return parser.parse(xml) as GpxData;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export function extractActivityFromGpx(data: GpxData): ParsedActivityData {
  const tracks = data.gpx?.trk
    ? Array.isArray(data.gpx.trk)
      ? data.gpx.trk
      : [data.gpx.trk]
    : [];

  if (tracks.length === 0) throw new Error("No tracks found in .gpx file");

  const track = tracks[0];
  const segments = track.trkseg
    ? Array.isArray(track.trkseg)
      ? track.trkseg
      : [track.trkseg]
    : [];

  const allPoints: GpxPoint[] = segments.flatMap((seg) =>
    seg.trkpt ? (Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt]) : []
  );

  if (allPoints.length === 0) throw new Error("No track points found in .gpx file");

  const firstPoint = allPoints[0];
  const lastPoint = allPoints[allPoints.length - 1];

  const startedAt = new Date(
    firstPoint.time ?? data.gpx?.metadata?.time ?? Date.now()
  );
  const endedAt = new Date(lastPoint.time ?? Date.now());
  const durationSec = Math.max(
    (endedAt.getTime() - startedAt.getTime()) / 1000,
    1
  );

  const distanceM = calculateTotalDistance(allPoints);
  const { gainM, lossM } = calculateElevationChanges(allPoints);
  const avgHrBpm = averageExtensionHR(allPoints);
  const avgCadRpm = averageExtensionCadence(allPoints);

  return {
    name: track.name ?? data.gpx?.metadata?.name,
    sport: "running",
    startedAt,
    durationSec,
    distanceM,
    elevationGainM: gainM > 0 ? gainM : undefined,
    elevationLossM: lossM > 0 ? lossM : undefined,
    startLat: firstPoint["@_lat"],
    startLon: firstPoint["@_lon"],
    avgHeartRateBpm: avgHrBpm,
    avgCadenceRpm: avgCadRpm,
    avgPaceMperS: distanceM / durationSec,
    records: allPoints,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance between two lat/lon points in meters */
function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function calculateTotalDistance(points: GpxPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (
      prev["@_lat"] != null &&
      prev["@_lon"] != null &&
      curr["@_lat"] != null &&
      curr["@_lon"] != null
    ) {
      total += haversineM(prev["@_lat"]!, prev["@_lon"]!, curr["@_lat"]!, curr["@_lon"]!);
    }
  }
  return total;
}

function calculateElevationChanges(points: GpxPoint[]): {
  gainM: number;
  lossM: number;
} {
  let gainM = 0;
  let lossM = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].ele;
    const curr = points[i].ele;
    if (prev != null && curr != null) {
      const diff = curr - prev;
      if (diff > 0) gainM += diff;
      else lossM += Math.abs(diff);
    }
  }
  return { gainM, lossM };
}

function averageExtensionHR(points: GpxPoint[]): number | undefined {
  const values = points
    .map((p) => p.extensions?.["gpxtpx:TrackPointExtension"]?.["gpxtpx:hr"])
    .filter((v): v is number => v != null);
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function averageExtensionCadence(points: GpxPoint[]): number | undefined {
  const values = points
    .map((p) => p.extensions?.["gpxtpx:TrackPointExtension"]?.["gpxtpx:cad"])
    .filter((v): v is number => v != null);
  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export { haversineM };
