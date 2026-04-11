import { describe, it, expect } from "vitest";
import {
  parseGpxString,
  extractActivityFromGpx,
  haversineM,
  type GpxData,
} from "./gpx";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>Morning Run</name>
    <time>2024-05-01T07:00:00Z</time>
  </metadata>
  <trk>
    <name>Morning Run</name>
    <trkseg>
      <trkpt lat="-23.5500" lon="-46.6300">
        <ele>760</ele>
        <time>2024-05-01T07:00:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>140</gpxtpx:hr>
            <gpxtpx:cad>88</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="-23.5510" lon="-46.6310">
        <ele>762</ele>
        <time>2024-05-01T07:05:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>155</gpxtpx:hr>
            <gpxtpx:cad>90</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="-23.5520" lon="-46.6320">
        <ele>758</ele>
        <time>2024-05-01T07:10:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>160</gpxtpx:hr>
            <gpxtpx:cad>92</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

// ---------------------------------------------------------------------------
// haversineM
// ---------------------------------------------------------------------------

describe("haversineM", () => {
  it("returns 0 for identical points", () => {
    expect(haversineM(0, 0, 0, 0)).toBe(0);
  });

  it("returns known distance between São Paulo and Rio de Janeiro (≈358 km)", () => {
    const distM = haversineM(-23.55, -46.63, -22.91, -43.17);
    expect(distM).toBeGreaterThan(350_000);
    expect(distM).toBeLessThan(365_000);
  });

  it("is symmetric", () => {
    const ab = haversineM(-23.55, -46.63, -22.91, -43.17);
    const ba = haversineM(-22.91, -43.17, -23.55, -46.63);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });
});

// ---------------------------------------------------------------------------
// parseGpxString
// ---------------------------------------------------------------------------

describe("parseGpxString", () => {
  it("parses a valid GPX string into an object", () => {
    const data = parseGpxString(MINIMAL_GPX);
    expect(data.gpx).toBeDefined();
    expect(data.gpx?.metadata?.name).toBe("Morning Run");
  });

  it("parses track points as an array", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const trk = Array.isArray(data.gpx?.trk) ? data.gpx!.trk[0] : data.gpx?.trk;
    const seg = Array.isArray(trk?.trkseg) ? trk!.trkseg[0] : trk?.trkseg;
    const points = Array.isArray(seg?.trkpt) ? seg!.trkpt : seg?.trkpt ? [seg.trkpt] : [];
    expect(points.length).toBe(3);
  });

  it("parses latitude and longitude as numbers", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const trk = Array.isArray(data.gpx?.trk) ? data.gpx!.trk[0] : data.gpx?.trk;
    const seg = Array.isArray(trk?.trkseg) ? trk!.trkseg[0] : trk?.trkseg;
    const points = Array.isArray(seg?.trkpt) ? seg!.trkpt : [seg?.trkpt!];
    expect(typeof points[0]?.["@_lat"]).toBe("number");
    expect(points[0]?.["@_lat"]).toBeCloseTo(-23.55, 3);
  });
});

// ---------------------------------------------------------------------------
// extractActivityFromGpx
// ---------------------------------------------------------------------------

describe("extractActivityFromGpx", () => {
  it("extracts activity from parsed GPX data", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    expect(result.sport).toBe("running");
    expect(result.name).toBe("Morning Run");
  });

  it("sets startedAt from first trackpoint time", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    expect(result.startedAt).toEqual(new Date("2024-05-01T07:00:00Z"));
  });

  it("calculates durationSec from first to last trackpoint", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    // 07:00 → 07:10 = 600 seconds
    expect(result.durationSec).toBe(600);
  });

  it("calculates non-zero distance", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    // Three nearby points in São Paulo — distance should be a few hundred meters
    expect(result.distanceM).toBeGreaterThan(100);
    expect(result.distanceM).toBeLessThan(5000);
  });

  it("extracts average heart rate from extensions", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    // avg of [140, 155, 160] = 151.67
    expect(result.avgHeartRateBpm).toBeCloseTo(151.67, 1);
  });

  it("extracts average cadence from extensions", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    // avg of [88, 90, 92] = 90
    expect(result.avgCadenceRpm).toBeCloseTo(90, 1);
  });

  it("extracts GPS start point", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    expect(result.startLat).toBeCloseTo(-23.55, 3);
    expect(result.startLon).toBeCloseTo(-46.63, 3);
  });

  it("calculates elevation gain and loss", () => {
    const data = parseGpxString(MINIMAL_GPX);
    const result = extractActivityFromGpx(data);

    // ele: 760 → 762 → 758: gain=2, loss=4
    expect(result.elevationGainM).toBeCloseTo(2, 0);
    expect(result.elevationLossM).toBeCloseTo(4, 0);
  });

  it("throws when no tracks are found", () => {
    const emptyData: GpxData = { gpx: {} };
    expect(() => extractActivityFromGpx(emptyData)).toThrowError(
      "No tracks found in .gpx file"
    );
  });

  it("throws when no track points are found", () => {
    const noPoints: GpxData = {
      gpx: { trk: { name: "Empty", trkseg: { trkpt: undefined } } },
    };
    expect(() => extractActivityFromGpx(noPoints)).toThrowError(
      "No track points found in .gpx file"
    );
  });
});
