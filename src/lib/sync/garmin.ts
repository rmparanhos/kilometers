/**
 * Garmin Connect sync service
 *
 * Pulls recent running activities from Garmin Connect, downloads the original
 * .fit file for each one, parses it, and inserts new activities into the DB.
 *
 * Authentication uses email/password from env vars. The OAuth token is cached
 * in db/garmin-token.json to avoid re-authenticating on every sync.
 */
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import AdmZip from "adm-zip";
import { GarminConnect } from "garmin-connect";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseFitBuffer, extractActivityFromFit } from "@/lib/parsers/fit";
import { normalizeToActivityInsert } from "@/lib/parsers/normalize";
import {
  estimateHrTSS,
  estimateLoadFromDuration,
} from "@/lib/training/metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncOptions {
  /** Number of most recent activities to check (default: 30) */
  limit?: number;
  /** Only sync activities of this type key (default: "running") */
  activityTypeKey?: string;
}

export interface SyncResult {
  imported: number;
  skipped: number;
  errors: { activityId: number; message: string }[];
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

const TOKEN_PATH = path.join(process.cwd(), "db", "garmin-token.json");

async function createAuthenticatedClient(): Promise<GarminConnect> {
  const email = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "GARMIN_EMAIL and GARMIN_PASSWORD must be set in .env.local"
    );
  }

  const gc = new GarminConnect(undefined);

  // Try to reuse a cached token to avoid re-authenticating every time
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      await gc.loadTokenByFile(TOKEN_PATH);
      return gc;
    } catch {
      // Token expired or invalid — fall through to full login
    }
  }

  await gc.login(email, password);

  // Persist token for next sync
  try {
    await gc.exportTokenToFile(TOKEN_PATH);
  } catch {
    // Non-fatal — next sync will just re-authenticate
  }

  return gc;
}

// ---------------------------------------------------------------------------
// FIT file download
// ---------------------------------------------------------------------------

/**
 * Downloads the original .fit file for a Garmin activity.
 * Garmin delivers the file as a ZIP — we extract the .fit in memory.
 */
async function downloadFitBuffer(
  gc: GarminConnect,
  activity: { activityId: number }
): Promise<Buffer> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "km-garmin-"));

  try {
    await gc.downloadOriginalActivityData(activity, tmpDir, "zip");

    const zipPath = path.join(tmpDir, `${activity.activityId}.zip`);
    const zip = new AdmZip(zipPath);

    const fitEntry = zip
      .getEntries()
      .find((e) => e.entryName.toLowerCase().endsWith(".fit"));

    if (!fitEntry) {
      throw new Error(
        `No .fit file found inside ZIP for activity ${activity.activityId}`
      );
    }

    return fitEntry.getData();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncGarminActivities(
  userId: string,
  opts: SyncOptions = {}
): Promise<SyncResult> {
  const { limit = 30, activityTypeKey = "running" } = opts;

  const gc = await createAuthenticatedClient();

  const allActivities = await gc.getActivities(0, limit);

  // Filter by sport type
  const targetActivities = allActivities.filter(
    (a) => a.activityType?.typeKey === activityTypeKey
  );

  const result: SyncResult = { imported: 0, skipped: 0, errors: [] };

  for (const garminActivity of targetActivities) {
    const externalId = String(garminActivity.activityId);

    // Skip if already imported
    const existing = db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          eq(activities.externalId, externalId)
        )
      )
      .get();

    if (existing) {
      result.skipped++;
      continue;
    }

    try {
      const fitBuffer = await downloadFitBuffer(gc, garminActivity);
      const fitData = await parseFitBuffer(fitBuffer);
      const parsed = extractActivityFromFit(fitData);

      const trainingLoad =
        parsed.avgHeartRateBpm != null
          ? estimateHrTSS(parsed.durationSec, parsed.avgHeartRateBpm)
          : estimateLoadFromDuration(parsed.durationSec);

      const insertData = normalizeToActivityInsert(parsed, userId, {
        sourceFile: `${garminActivity.activityId}.fit`,
        sourceFormat: "fit",
        externalId,
        trainingLoad,
      });

      // Use activity name from Garmin Connect if the FIT file didn't provide one
      if (!insertData.name && garminActivity.activityName) {
        insertData.name = garminActivity.activityName;
      }

      db.insert(activities).values(insertData).run();
      result.imported++;
    } catch (err) {
      result.errors.push({
        activityId: garminActivity.activityId,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}
