/**
 * Combined Garmin sync — download raw files, then recalculate from them.
 * Kept as a convenience wrapper for backward compatibility.
 */
import { downloadGarminActivities, type DownloadOptions } from "./garmin-download";
import { recalculateFromRaws } from "./garmin-recalculate";

export type { DownloadOptions as SyncOptions };

export interface SyncResult {
  downloaded: number;
  alreadyHave: number;
  created: number;
  updated: number;
  errors: { id: string; message: string }[];
}

export async function syncGarminActivities(
  userId: string,
  opts: DownloadOptions = {}
): Promise<SyncResult> {
  const dl = await downloadGarminActivities(userId, opts);
  const rc = await recalculateFromRaws(userId);

  return {
    downloaded: dl.downloaded,
    alreadyHave: dl.alreadyHave,
    created: rc.created,
    updated: rc.updated,
    errors: [
      ...dl.errors.map((e) => ({ id: String(e.garminActivityId), message: e.message })),
      ...rc.errors.map((e) => ({ id: e.garminActivityId, message: e.message })),
    ],
  };
}
