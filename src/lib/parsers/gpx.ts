/**
 * .gpx file parser wrapper
 *
 * Parses GPX XML into a structured object using fast-xml-parser.
 * Full implementation comes in Step 2 of the project roadmap.
 */
import { XMLParser } from "fast-xml-parser";

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

export function parseGpxString(xml: string): GpxData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: true,
  });
  return parser.parse(xml) as GpxData;
}
