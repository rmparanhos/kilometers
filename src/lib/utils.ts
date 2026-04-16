import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats meters as "X.XX km" */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "—";
  return (meters / 1000).toFixed(2) + " km";
}

/** Formats seconds as "H:MM:SS" or "MM:SS" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Formats m/s as "MM:SS /km" */
export function formatPace(mPerS: number | null | undefined): string {
  if (!mPerS) return "—";
  const secPerKm = 1000 / mPerS;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}
