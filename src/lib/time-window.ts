export type TimeWindow = "4w" | "3m" | "6m" | "1y" | "all";

export const VALID_WINDOWS: TimeWindow[] = ["4w", "3m", "6m", "1y", "all"];

export function windowToFromDate(window: TimeWindow): Date | null {
  const now = new Date();
  switch (window) {
    case "4w": {
      const d = new Date(now);
      d.setDate(d.getDate() - 28);
      return d;
    }
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case "1y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    case "all":
      return null;
  }
}
