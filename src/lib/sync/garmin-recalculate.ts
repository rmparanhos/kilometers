/**
 * Re-parses all saved Garmin raw .fit files and upserts into the activities table.
 * Never hits Garmin Connect — reads from disk only.
 *
 * Upsert rules:
 *   INSERT (new activity)  — all fields, plus best-effort weather fetch
 *   UPDATE (existing)      — all derived/parsed fields; preserves perceivedEffort,
 *                            equipmentId, weatherJson (already enriched)
 */
import path from "node:path";
import fs from "node:fs";
import { db } from "@/lib/db";
import { garminRaws, activities, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseFitBuffer, extractActivityFromFit } from "@/lib/parsers/fit";
import { normalizeToActivityInsert } from "@/lib/parsers/normalize";
import { estimateTrainingLoadWithModel } from "@/lib/training/metrics";
import { fetchWeather } from "@/lib/weather";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecalcResult {
  created: number;
  updated: number;
  errors: { garminActivityId: string; message: string }[];
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function recalculateFromRaws(userId: string): Promise<RecalcResult> {
  const userProfile = db
    .select({ hrMax: users.hrMax, hrRest: users.hrRest, lthrBpm: users.lthrBpm })
    .from(users)
    .where(eq(users.id, userId))
    .get() ?? { hrMax: null, hrRest: null, lthrBpm: null };

  const raws = db
    .select()
    .from(garminRaws)
    .where(and(eq(garminRaws.userId, userId)))
    .all()
    .filter((r) => r.fitPath != null);

  const result: RecalcResult = { created: 0, updated: 0, errors: [] };

  for (const raw of raws) {
    try {
      const absPath = path.join(process.cwd(), raw.fitPath!);
      if (!fs.existsSync(absPath)) {
        result.errors.push({ garminActivityId: raw.garminActivityId, message: "FIT file not found on disk" });
        continue;
      }

      const fitBuffer = fs.readFileSync(absPath);
      const fitData = await parseFitBuffer(fitBuffer);
      const parsed = extractActivityFromFit(fitData);

      const { load: trainingLoad, model: loadModel } = estimateTrainingLoadWithModel(
        parsed.durationSec,
        parsed.avgHeartRateBpm,
        userProfile
      );

      // Garmin meta may carry the activity name
      let garminName: string | null = null;
      if (raw.garminMetaJson) {
        try {
          const meta = JSON.parse(raw.garminMetaJson) as { activityName?: string };
          garminName = meta.activityName ?? null;
        } catch { /* ignore */ }
      }

      const existing = db
        .select({
          id: activities.id,
          name: activities.name,
          weatherJson: activities.weatherJson,
        })
        .from(activities)
        .where(and(eq(activities.userId, userId), eq(activities.externalId, raw.garminActivityId)))
        .get();

      if (existing) {
        // UPDATE: recomputed metrics + raw data; preserve user fields and weather
        db.update(activities)
          .set({
            sport: parsed.sport ?? "running",
            startedAt: parsed.startedAt,
            durationSec: parsed.durationSec,
            movingTimeSec: parsed.movingTimeSec ?? null,
            distanceM: parsed.distanceM,
            elevationGainM: parsed.elevationGainM ?? null,
            elevationLossM: parsed.elevationLossM ?? null,
            startLat: parsed.startLat ?? null,
            startLon: parsed.startLon ?? null,
            avgHeartRateBpm: parsed.avgHeartRateBpm ?? null,
            maxHeartRateBpm: parsed.maxHeartRateBpm ?? null,
            avgCadenceRpm: parsed.avgCadenceRpm ?? null,
            avgPaceMperS: parsed.avgPaceMperS ?? null,
            trainingLoad,
            loadModel,
            rawDataJson: parsed.records ? JSON.stringify(parsed.records) : null,
            // name: only fill if currently null
            ...(existing.name == null && (parsed.name ?? garminName)
              ? { name: parsed.name ?? garminName }
              : {}),
          })
          .where(eq(activities.id, existing.id))
          .run();

        result.updated++;
      } else {
        // INSERT: full new activity
        const insertData = normalizeToActivityInsert(parsed, userId, {
          sourceFile: `${raw.garminActivityId}.fit`,
          sourceFormat: "fit",
          externalId: raw.garminActivityId,
          trainingLoad,
          loadModel,
        });

        if (!insertData.name && garminName) insertData.name = garminName;

        const [created] = db.insert(activities).values(insertData).returning().all();
        result.created++;

        // Best-effort weather enrichment for new activities
        if (created.startLat != null && created.startLon != null) {
          try {
            const weather = await fetchWeather(created.startLat, created.startLon, created.startedAt);
            if (weather) {
              db.update(activities)
                .set({ weatherJson: JSON.stringify(weather) })
                .where(eq(activities.id, created.id))
                .run();
            }
          } catch { /* non-fatal */ }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[garmin-recalc] raw ${raw.garminActivityId}: ${message}`);
      result.errors.push({ garminActivityId: raw.garminActivityId, message });
    }
  }

  return result;
}
