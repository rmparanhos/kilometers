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
import { activities, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseFitBuffer, extractActivityFromFit } from "@/lib/parsers/fit";
import { normalizeToActivityInsert } from "@/lib/parsers/normalize";
import { estimateTrainingLoadWithModel } from "@/lib/training/metrics";

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

async function createAuthenticatedClient(email: string, password: string): Promise<GarminConnect> {
  const gc = new GarminConnect({ username: email, password });

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
  const { limit = 200, activityTypeKey = "" } = opts;

  const userProfile = db.select({
    hrMax: users.hrMax,
    hrRest: users.hrRest,
    lthrBpm: users.lthrBpm,
    garminEmail: users.garminEmail,
    garminPassword: users.garminPassword,
  }).from(users).where(eq(users.id, userId)).get() ?? { hrMax: null, hrRest: null, lthrBpm: null, garminEmail: null, garminPassword: null };

  if (!userProfile.garminEmail || !userProfile.garminPassword) {
    throw new Error("Garmin credentials not configured. Add them on the Profile page.");
  }

  const gc = await createAuthenticatedClient(userProfile.garminEmail, userProfile.garminPassword);

  const allActivities = await gc.getActivities(0, limit);

  const targetActivities = activityTypeKey
    ? allActivities.filter((a) => a.activityType?.typeKey === activityTypeKey)
    : allActivities;
 
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

      const { load: trainingLoad, model: loadModel } = estimateTrainingLoadWithModel(
        parsed.durationSec,
        parsed.avgHeartRateBpm,
        userProfile
      );

      const insertData = normalizeToActivityInsert(parsed, userId, {
        sourceFile: `${garminActivity.activityId}.fit`,
        sourceFormat: "fit",
        externalId,
        trainingLoad,
        loadModel,
      });

      // Use activity name from Garmin Connect if the FIT file didn't provide one
      if (!insertData.name && garminActivity.activityName) {
        insertData.name = garminActivity.activityName;
      }

      db.insert(activities).values(insertData).run();
      result.imported++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(
        `[garmin-sync] activity ${garminActivity.activityId} (${garminActivity.activityName ?? "unnamed"}): ${message}`
      );
      result.errors.push({ activityId: garminActivity.activityId, message });
    }
  }

  if (result.errors.length > 0) {
    console.warn(
      `[garmin-sync] finished with ${result.errors.length} error(s). First: ${result.errors[0].message}`
    );
  }

  return result;
}
