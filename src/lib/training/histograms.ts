export interface HistogramBucket {
  label: string;
  count: number;
  center: number;
}

export type TimeWindow = "30d" | "90d" | "ytd" | "all";

export const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All" },
];

export const DEFAULT_TIME_WINDOW: TimeWindow = "90d";

export function parseTimeWindow(raw: string | undefined): TimeWindow {
  if (raw === "30d" || raw === "90d" || raw === "ytd" || raw === "all") {
    return raw;
  }
  return DEFAULT_TIME_WINDOW;
}

export function filterByWindow<T extends { startedAt: Date }>(
  activities: T[],
  window: TimeWindow,
  now: Date = new Date()
): T[] {
  if (window === "all") return activities;
  let cutoff: Date;
  if (window === "ytd") {
    cutoff = new Date(now.getFullYear(), 0, 1);
  } else {
    const days = window === "30d" ? 30 : 90;
    cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  return activities.filter((a) => a.startedAt >= cutoff);
}

const DISTANCE_BUCKETS = [
  { maxKm: 3, label: "<3 km" },
  { maxKm: 5, label: "3–5 km" },
  { maxKm: 8, label: "5–8 km" },
  { maxKm: 12, label: "8–12 km" },
  { maxKm: 18, label: "12–18 km" },
  { maxKm: 25, label: "18–25 km" },
  { maxKm: Infinity, label: "25+ km" },
] as const;

export function bucketDistances(distancesM: number[]): HistogramBucket[] {
  const counts = new Array<number>(DISTANCE_BUCKETS.length).fill(0);
  for (const d of distancesM) {
    if (!Number.isFinite(d) || d < 0) continue;
    const km = d / 1000;
    for (let i = 0; i < DISTANCE_BUCKETS.length; i++) {
      if (km < DISTANCE_BUCKETS[i].maxKm) {
        counts[i]++;
        break;
      }
    }
  }
  return DISTANCE_BUCKETS.map((b, i) => ({
    label: b.label,
    count: counts[i],
    center: i,
  }));
}

export function bucketCadences(
  cadences: number[],
  binWidth = 2
): HistogramBucket[] {
  const valid = cadences.filter((c) => Number.isFinite(c) && c > 0);
  if (valid.length === 0) return [];

  let min = Infinity;
  let max = -Infinity;
  for (const c of valid) {
    if (c < min) min = c;
    if (c > max) max = c;
  }

  const startBin = Math.floor(min / binWidth) * binWidth;
  const endBin = Math.ceil((max + 0.001) / binWidth) * binWidth;
  const numBins = Math.max(1, (endBin - startBin) / binWidth);
  const counts = new Array<number>(numBins).fill(0);

  for (const c of valid) {
    const idx = Math.min(numBins - 1, Math.floor((c - startBin) / binWidth));
    counts[idx]++;
  }

  return counts.map((count, i) => {
    const start = startBin + i * binWidth;
    const center = start + binWidth / 2;
    return { label: `${Math.round(center)}`, count, center };
  });
}
