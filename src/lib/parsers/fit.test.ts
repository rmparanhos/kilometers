import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { extractActivityFromFit, parseFitBuffer, type ParsedFit } from "./fit";

// ---------------------------------------------------------------------------
// Minimal mock helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: "2024-05-01T07:00:00.000Z",
    start_time: new Date("2024-05-01T07:00:00.000Z"),
    sport: "running",
    total_elapsed_time: 3600,
    total_timer_time: 3540,
    total_distance: 10_000,
    total_ascent: 120,
    total_descent: 115,
    avg_heart_rate: 155,
    max_heart_rate: 178,
    avg_cadence: 88, // per-leg — extractActivityFromFit doubles this to 176 spm
    enhanced_avg_speed: 2.78,
    ...overrides,
  };
}

function makeFit(sessionOverrides: Record<string, unknown> = {}): ParsedFit {
  return {
    protocolVersion: 32,
    profileVersion: 2132,
    user_profile: {},
    activity: {
      timestamp: "2024-05-01T07:00:00.000Z",
      sessions: [makeSession(sessionOverrides) as never],
    },
    sessions: [makeSession(sessionOverrides) as never],
    records: [
      {
        timestamp: "2024-05-01T07:00:00.000Z",
        position_lat: -23.55,
        position_long: -46.63,
        heart_rate: 145,
        enhanced_speed: 2.7,
        distance: 0,
      },
    ],
  } as unknown as ParsedFit;
}

// ---------------------------------------------------------------------------
// Unit tests (mocked data)
// ---------------------------------------------------------------------------

describe("extractActivityFromFit", () => {
  it("extracts basic fields from a session", () => {
    const result = extractActivityFromFit(makeFit());

    expect(result.startedAt).toEqual(new Date("2024-05-01T07:00:00.000Z"));
    expect(result.durationSec).toBe(3600);
    expect(result.movingTimeSec).toBe(3540);
    expect(result.distanceM).toBe(10_000);
    expect(result.elevationGainM).toBe(120);
    expect(result.elevationLossM).toBe(115);
  });

  it("extracts heart rate", () => {
    const result = extractActivityFromFit(makeFit());

    expect(result.avgHeartRateBpm).toBe(155);
    expect(result.maxHeartRateBpm).toBe(178);
  });

  it("prefers enhanced_avg_speed over avg_speed", () => {
    const result = extractActivityFromFit(
      makeFit({ enhanced_avg_speed: 3.5, avg_speed: 2.0 })
    );
    expect(result.avgPaceMperS).toBe(3.5);
  });

  it("falls back to avg_speed when enhanced_avg_speed is missing", () => {
    const result = extractActivityFromFit(
      makeFit({ enhanced_avg_speed: undefined, avg_speed: 2.78 })
    );
    expect(result.avgPaceMperS).toBe(2.78);
  });

  it("falls back to distance/time when both speed fields are missing", () => {
    // 10000m / 3600s ≈ 2.778 m/s
    const result = extractActivityFromFit(
      makeFit({ enhanced_avg_speed: undefined, avg_speed: undefined })
    );
    expect(result.avgPaceMperS).toBeCloseTo(10_000 / 3600, 3);
  });

  it("doubles avg_cadence for total steps per minute", () => {
    const result = extractActivityFromFit(makeFit({ avg_cadence: 88 }));
    expect(result.avgCadenceRpm).toBe(176); // 88 × 2
  });

  it("returns undefined cadence when avg_cadence is missing", () => {
    const result = extractActivityFromFit(makeFit({ avg_cadence: undefined }));
    expect(result.avgCadenceRpm).toBeUndefined();
  });

  it("extracts GPS start point from first record", () => {
    const result = extractActivityFromFit(makeFit());
    expect(result.startLat).toBe(-23.55);
    expect(result.startLon).toBe(-46.63);
  });

  it("normalizes sport to lowercase", () => {
    const result = extractActivityFromFit(makeFit({ sport: "Running" }));
    expect(result.sport).toBe("running");
  });

  it("defaults sport to 'running' when missing", () => {
    const result = extractActivityFromFit(makeFit({ sport: undefined }));
    expect(result.sport).toBe("running");
  });

  it("defaults durationSec to 0 when total_elapsed_time missing", () => {
    const result = extractActivityFromFit(
      makeFit({ total_elapsed_time: undefined })
    );
    expect(result.durationSec).toBe(0);
  });

  it("defaults distanceM to 0 when total_distance missing", () => {
    const result = extractActivityFromFit(makeFit({ total_distance: undefined }));
    expect(result.distanceM).toBe(0);
  });

  it("throws when no session is found", () => {
    const emptyFit: ParsedFit = {
      protocolVersion: 32,
      profileVersion: 2132,
      user_profile: {},
      activity: { timestamp: "2024-05-01T07:00:00.000Z" },
    } as unknown as ParsedFit;

    expect(() => extractActivityFromFit(emptyFit)).toThrowError(
      "No session found in .fit file"
    );
  });

  it("falls back to activity.sessions when top-level sessions is missing", () => {
    const fit = makeFit();
    const fitNoTopSessions = {
      ...fit,
      sessions: undefined,
    } as unknown as ParsedFit;

    const result = extractActivityFromFit(fitNoTopSessions);
    expect(result.distanceM).toBe(10_000);
  });

  it("includes records in output", () => {
    const result = extractActivityFromFit(makeFit());
    expect(Array.isArray(result.records)).toBe(true);
    expect((result.records as unknown[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Integration test — real .fit file (Garmin Running Power, July 2025)
// Values validated against the source device / Garmin Connect.
// ---------------------------------------------------------------------------

describe("parseFitBuffer + extractActivityFromFit — real fixture", () => {
  const fixturePath = path.join(__dirname, "fixtures/267379-172304617.fit");

  it("parses the real file and extracts correct activity data", async () => {
    const buffer = fs.readFileSync(fixturePath);
    const fitData = await parseFitBuffer(buffer);
    const result = extractActivityFromFit(fitData);

    // Sport
    expect(result.sport).toBe("running");

    // Start time (UTC)
    expect(result.startedAt).toEqual(new Date("2025-07-13T09:12:30.000Z"));

    // Distance — half marathon (~21.36 km)
    expect(result.distanceM).toBeCloseTo(21_362, -1);

    // Duration — ~1h 55m 49s
    expect(result.durationSec).toBeCloseTo(6949, 0);

    // Pace — ~5:25 /km → ~3.07 m/s
    expect(result.avgPaceMperS).toBeCloseTo(3.074, 1);

    // Heart rate
    expect(result.avgHeartRateBpm).toBe(175);
    expect(result.maxHeartRateBpm).toBe(187);

    // Cadence — device stores 92 (per-leg), we output 184 total spm
    expect(result.avgCadenceRpm).toBe(184);

    // Elevation
    expect(result.elevationGainM).toBe(26);
    expect(result.elevationLossM).toBe(27);

    // GPS start — Rio de Janeiro (Barra da Tijuca area)
    expect(result.startLat).toBeCloseTo(-22.987, 2);
    expect(result.startLon).toBeCloseTo(-43.224, 2);
  });

  it("captures all 6949 data records", async () => {
    const buffer = fs.readFileSync(fixturePath);
    const fitData = await parseFitBuffer(buffer);
    const result = extractActivityFromFit(fitData);

    expect(Array.isArray(result.records)).toBe(true);
    expect((result.records as unknown[]).length).toBe(6949);
  });
});
