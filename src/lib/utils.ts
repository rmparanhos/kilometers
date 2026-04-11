/**
 * Shared formatting utilities.
 * All values are stored in SI units in the DB — format at display time.
 */

/** Converts m/s to a "mm:ss /km" pace string */
export function formatPace(mPerS: number | null | undefined): string {
  if (!mPerS || mPerS <= 0) return "—";
  const secondsPerKm = 1000 / mPerS;
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.round(secondsPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${min}:${sec} /km`;
}

/** Converts meters to a readable distance string */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

/** Formats a duration in seconds to "h:mm:ss" or "mm:ss" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s}`;
  return `${m}:${s}`;
}
