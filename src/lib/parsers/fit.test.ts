import { describe, it, expect } from "vitest";
import { extractActivityFromFit, type ParsedFit } from "./fit";

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
    avg_cadence: 176,
    avg_speed: 2.78, // ~10 km/h
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
        speed: 2.7,
        distance: 0,
      },
    ],
  } as unknown as ParsedFit;
}

// ---------------------------------------------------------------------------
// Tests
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

  it("extracts heart rate and pace", () => {
    const result = extractActivityFromFit(makeFit());

    expect(result.avgHeartRateBpm).toBe(155);
    expect(result.maxHeartRateBpm).toBe(178);
    expect(result.avgPaceMperS).toBe(2.78);
  });

  it("extracts cadence", () => {
    const result = extractActivityFromFit(makeFit());
    expect(result.avgCadenceRpm).toBe(176);
  });

  it("extracts GPS start point from first record", () => {
    const result = extractActivityFromFit(makeFit());
    expect(result.startLat).toBe(-23.55);
    expect(result.startLon).toBe(-46.63);
  });

  it("normalizes sport to lowercase", () => {
    const result = extractActivityFromFit(makeFit({ sport: "running" }));
    expect(result.sport).toBe("running");
  });

  it("defaults sport to 'running' when missing", () => {
    const result = extractActivityFromFit(makeFit({ sport: undefined }));
    expect(result.sport).toBe("running");
  });

  it("defaults durationSec to 0 when total_elapsed_time missing", () => {
    const result = extractActivityFromFit(makeFit({ total_elapsed_time: undefined }));
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
    const fitNoTopSessions = { ...fit, sessions: undefined } as unknown as ParsedFit;

    const result = extractActivityFromFit(fitNoTopSessions);
    expect(result.distanceM).toBe(10_000);
  });

  it("includes records in output", () => {
    const result = extractActivityFromFit(makeFit());
    expect(Array.isArray(result.records)).toBe(true);
    expect((result.records as unknown[]).length).toBeGreaterThan(0);
  });
});
