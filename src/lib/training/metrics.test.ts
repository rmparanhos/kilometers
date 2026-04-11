import { describe, it, expect } from "vitest";
import {
  computeFormSeries,
  fillGaps,
  estimateHrTSS,
  estimateLoadFromDuration,
  getFormZone,
} from "./metrics";

// ---------------------------------------------------------------------------
// computeFormSeries
// ---------------------------------------------------------------------------

describe("computeFormSeries", () => {
  it("returns empty array for empty input", () => {
    expect(computeFormSeries([])).toEqual([]);
  });

  it("starts CTL and ATL from 0", () => {
    const day1 = new Date("2024-01-01");
    const [point] = computeFormSeries([{ date: day1, load: 100 }]);

    // CTL = 0 + (100 - 0) * (1/42) ≈ 2.381
    expect(point.ctl).toBeCloseTo(100 / 42, 1);
    // ATL = 0 + (100 - 0) * (1/7) ≈ 14.286
    expect(point.atl).toBeCloseTo(100 / 7, 1);
  });

  it("TSB = CTL - ATL", () => {
    const day1 = new Date("2024-01-01");
    const [point] = computeFormSeries([{ date: day1, load: 100 }]);

    expect(point.tsb).toBeCloseTo(point.ctl - point.atl, 1);
  });

  it("converges CTL toward load over many identical days", () => {
    const loads = Array.from({ length: 200 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      load: 100,
    }));
    const series = computeFormSeries(loads);
    const last = series[series.length - 1];

    // After enough days with constant load, CTL ≈ ATL ≈ load
    expect(last.ctl).toBeGreaterThan(90);
    expect(last.atl).toBeGreaterThan(95);
  });

  it("ATL decays faster than CTL on rest days", () => {
    // Build up load then rest
    const loadDays = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      load: 80,
    }));
    const restDays = Array.from({ length: 14 }, (_, i) => ({
      date: new Date(2024, 0, 31 + i),
      load: 0,
    }));
    const series = computeFormSeries([...loadDays, ...restDays]);

    const afterLoad = series[29]; // last training day
    const afterRest = series[series.length - 1];

    // ATL drops more than CTL during rest
    const ctlDrop = afterLoad.ctl - afterRest.ctl;
    const atlDrop = afterLoad.atl - afterRest.atl;
    expect(atlDrop).toBeGreaterThan(ctlDrop);
  });

  it("attaches a dateLabel formatted as yyyy-MM-dd", () => {
    const day = new Date("2024-06-15T12:00:00.000Z");
    const [point] = computeFormSeries([{ date: day, load: 50 }]);
    expect(point.dateLabel).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// fillGaps
// ---------------------------------------------------------------------------

describe("fillGaps", () => {
  it("returns empty array when no activities given", () => {
    expect(fillGaps([])).toEqual([]);
  });

  it("fills rest days with load = 0", () => {
    const activities = [
      { startedAt: new Date("2024-01-01"), trainingLoad: 50 },
      { startedAt: new Date("2024-01-05"), trainingLoad: 60 },
    ];
    const result = fillGaps(activities, new Date("2024-01-05"));

    expect(result).toHaveLength(5); // Jan 1–5
    expect(result[0].load).toBe(50);
    expect(result[1].load).toBe(0); // Jan 2
    expect(result[2].load).toBe(0); // Jan 3
    expect(result[3].load).toBe(0); // Jan 4
    expect(result[4].load).toBe(60);
  });

  it("sums multiple activities on the same day", () => {
    const activities = [
      { startedAt: new Date("2024-01-01T07:00:00"), trainingLoad: 40 },
      { startedAt: new Date("2024-01-01T18:00:00"), trainingLoad: 30 },
    ];
    const result = fillGaps(activities, new Date("2024-01-01"));

    expect(result).toHaveLength(1);
    expect(result[0].load).toBe(70);
  });

  it("treats null trainingLoad as 0", () => {
    const activities = [{ startedAt: new Date("2024-01-01"), trainingLoad: null }];
    const result = fillGaps(activities, new Date("2024-01-01"));

    expect(result[0].load).toBe(0);
  });

  it("extends to endDate inclusive", () => {
    const activities = [{ startedAt: new Date("2024-01-01"), trainingLoad: 50 }];
    const result = fillGaps(activities, new Date("2024-01-03"));

    expect(result).toHaveLength(3);
    expect(result[1].load).toBe(0);
    expect(result[2].load).toBe(0);
  });

  it("handles unsorted activity input", () => {
    const activities = [
      { startedAt: new Date("2024-01-03"), trainingLoad: 60 },
      { startedAt: new Date("2024-01-01"), trainingLoad: 40 },
    ];
    const result = fillGaps(activities, new Date("2024-01-03"));

    expect(result[0].load).toBe(40); // Jan 1 is first
    expect(result[2].load).toBe(60); // Jan 3
  });
});

// ---------------------------------------------------------------------------
// estimateHrTSS
// ---------------------------------------------------------------------------

describe("estimateHrTSS", () => {
  it("returns 0 for zero duration", () => {
    expect(estimateHrTSS(0, 150)).toBe(0);
  });

  it("returns 100 for 1 hour at LTHR", () => {
    // 1 hour at exactly LTHR: (1 hour × 1.0 ratio × 100) = 100
    expect(estimateHrTSS(3600, 170, 170)).toBe(100);
  });

  it("is proportional to duration", () => {
    const half = estimateHrTSS(1800, 170, 170);
    const full = estimateHrTSS(3600, 170, 170);
    expect(full).toBeCloseTo(half * 2, 1);
  });

  it("is proportional to HR ratio", () => {
    const low = estimateHrTSS(3600, 85, 170);   // 50% of LTHR
    const high = estimateHrTSS(3600, 170, 170); // 100% of LTHR
    expect(high).toBeCloseTo(low * 2, 1);
  });
});

// ---------------------------------------------------------------------------
// estimateLoadFromDuration
// ---------------------------------------------------------------------------

describe("estimateLoadFromDuration", () => {
  it("returns 60 for 1 hour", () => {
    expect(estimateLoadFromDuration(3600)).toBe(60);
  });

  it("returns 30 for 30 minutes", () => {
    expect(estimateLoadFromDuration(1800)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// getFormZone
// ---------------------------------------------------------------------------

describe("getFormZone", () => {
  it("peak when TSB > 10", () => {
    expect(getFormZone(15)).toBe("peak");
    expect(getFormZone(10.1)).toBe("peak");
  });

  it("fresh when 0 < TSB ≤ 10", () => {
    expect(getFormZone(5)).toBe("fresh");
    expect(getFormZone(0.1)).toBe("fresh");
    expect(getFormZone(10)).toBe("fresh");
  });

  it("neutral when -10 < TSB ≤ 0", () => {
    expect(getFormZone(0)).toBe("neutral");
    expect(getFormZone(-5)).toBe("neutral");
  });

  it("fatigued when -30 < TSB ≤ -10", () => {
    expect(getFormZone(-10)).toBe("fatigued");
    expect(getFormZone(-20)).toBe("fatigued");
  });

  it("overreached when TSB ≤ -30", () => {
    expect(getFormZone(-30)).toBe("overreached");
    expect(getFormZone(-50)).toBe("overreached");
  });
});
