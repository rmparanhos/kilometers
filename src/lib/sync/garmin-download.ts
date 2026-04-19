/**
 * Downloads raw Garmin Connect activities (.fit files + metadata) to disk.
 * Does NOT parse or insert into the activities table — that is recalculate's job.
 */
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import AdmZip from "adm-zip";
import { GarminConnect } from "garmin-connect";
import { db } from "@/lib/db";
import { garminRaws, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DownloadOptions {
  limit?: number;
  activityTypeKey?: string;
}

export interface DownloadResult {
  downloaded: number;
  alreadyHave: number;
  errors: { garminActivityId: number; message: string }[];
}

// ---------------------------------------------------------------------------
// Auth (shared token cache)
// ---------------------------------------------------------------------------

function tokenPath(email: string): string {
  return path.join(process.cwd(), "db", `${email}-garmin-token.json`);
}

async function createAuthenticatedClient(email: string, password: string): Promise<GarminConnect> {
  const gc = new GarminConnect({ username: email, password });
  const tp = tokenPath(email);
  if (fs.existsSync(tp)) {
    try {
      await gc.loadTokenByFile(tp);
      return gc;
    } catch {
      // expired — fall through
    }
  }
  await gc.login(email, password);
  try { await gc.exportTokenToFile(tp); } catch { /* non-fatal */ }
  return gc;
}

// ---------------------------------------------------------------------------
// Raw storage directory
// ---------------------------------------------------------------------------

function rawDir(userId: string): string {
  const dir = path.join(process.cwd(), "db", "garmin-raw", userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Download a single activity's .fit file, persist to disk
// ---------------------------------------------------------------------------

async function downloadAndSaveFit(
  gc: GarminConnect,
  garminActivity: { activityId: number },
  userId: string
): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "km-garmin-"));
  try {
    await gc.downloadOriginalActivityData(garminActivity, tmpDir, "zip");
    const zipPath = path.join(tmpDir, `${garminActivity.activityId}.zip`);
    const zip = new AdmZip(zipPath);
    const fitEntry = zip.getEntries().find((e) => e.entryName.toLowerCase().endsWith(".fit"));
    if (!fitEntry) throw new Error(`No .fit inside ZIP for activity ${garminActivity.activityId}`);

    const destDir = rawDir(userId);
    const fitPath = path.join(destDir, `${garminActivity.activityId}.fit`);
    fs.writeFileSync(fitPath, fitEntry.getData());

    // Store relative path for portability
    return path.relative(process.cwd(), fitPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function downloadGarminActivities(
  userId: string,
  opts: DownloadOptions = {}
): Promise<DownloadResult> {
  const { limit = 200, activityTypeKey = "" } = opts;

  const userProfile = db
    .select({ garminEmail: users.garminEmail, garminPassword: users.garminPassword })
    .from(users)
    .where(eq(users.id, userId))
    .get() ?? { garminEmail: null, garminPassword: null };

  if (!userProfile.garminEmail || !userProfile.garminPassword) {
    throw new Error("Garmin credentials not configured. Add them on the Profile page.");
  }

  const gc = await createAuthenticatedClient(userProfile.garminEmail, userProfile.garminPassword);
  const allActivities = await gc.getActivities(0, limit);
  const targets = activityTypeKey
    ? allActivities.filter((a) => a.activityType?.typeKey === activityTypeKey)
    : allActivities;

  const result: DownloadResult = { downloaded: 0, alreadyHave: 0, errors: [] };

  for (const act of targets) {
    const garminActivityId = String(act.activityId);

    const existing = db
      .select({ id: garminRaws.id })
      .from(garminRaws)
      .where(and(eq(garminRaws.userId, userId), eq(garminRaws.garminActivityId, garminActivityId)))
      .get();

    if (existing) {
      result.alreadyHave++;
      continue;
    }

    try {
      const fitPath = await downloadAndSaveFit(gc, act, userId);

      // Save metadata alongside the fit file
      const metaPath = fitPath.replace(/\.fit$/, ".meta.json");
      fs.writeFileSync(
        path.join(process.cwd(), metaPath),
        JSON.stringify(act, null, 2)
      );

      db.insert(garminRaws).values({
        userId,
        garminActivityId,
        fetchedAt: new Date(),
        garminMetaJson: JSON.stringify(act),
        fitPath,
      }).run();

      result.downloaded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[garmin-download] activity ${act.activityId}: ${message}`);
      result.errors.push({ garminActivityId: act.activityId, message });
    }
  }

  return result;
}
