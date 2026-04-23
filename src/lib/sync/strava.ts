import { db } from "@/lib/db";
import { users, stravaRaws, activities, activityLaps, equipment } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { estimateTrainingLoadWithModel } from "@/lib/training/metrics";
import { fetchWeather } from "@/lib/weather";
import type { NormalizedRecord } from "@/lib/parsers/records";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export interface SyncResult {
  downloaded: number;
  alreadyHave: number;
  created: number;
  errors: { id: string; message: string }[];
}

async function refreshStravaToken(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user?.stravaRefreshToken) throw new Error("Strava not connected");

  const now = Math.floor(Date.now() / 1000);
  if (user.stravaTokenExpiresAt && user.stravaTokenExpiresAt > now + 60) {
    return user.stravaAccessToken;
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: user.stravaRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Strava token");
  }

  const data = await res.json();
  const { access_token, refresh_token, expires_at } = data;

  db.update(users)
    .set({
      stravaAccessToken: access_token,
      stravaRefreshToken: refresh_token,
      stravaTokenExpiresAt: expires_at,
    })
    .where(eq(users.id, userId))
    .run();

  return access_token;
}

export async function syncStravaActivities(userId: string): Promise<SyncResult> {
  const result: SyncResult = { downloaded: 0, alreadyHave: 0, created: 0, errors: [] };

  const accessToken = await refreshStravaToken(userId);
  const userProfile = db
    .select({ hrMax: users.hrMax, hrRest: users.hrRest, lthrBpm: users.lthrBpm })
    .from(users)
    .where(eq(users.id, userId))
    .get() ?? { hrMax: null, hrRest: null, lthrBpm: null };

  // Get activities from Strava
  const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?per_page=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Strava API error: ${res.statusText}`);
  }

  const stravaActivities = await res.json();

  for (const stravaAct of stravaActivities) {
    // Only import runs
    if (stravaAct.type !== "Run") continue;

    const stravaId = String(stravaAct.id);

    // Check if we already have this in stravaRaws
    const existingRaw = db
      .select()
      .from(stravaRaws)
      .where(and(eq(stravaRaws.userId, userId), eq(stravaRaws.stravaActivityId, stravaId)))
      .get();

    if (existingRaw) {
      result.alreadyHave++;
      continue;
    }

    try {
      // 1. Fetch detailed activity for laps
      const detailRes = await fetch(`${STRAVA_API_BASE}/activities/${stravaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const detailedAct = detailRes.ok ? await detailRes.json() : stravaAct;

      // 2. Fetch streams for graphs
      const streamsRes = await fetch(
        `${STRAVA_API_BASE}/activities/${stravaId}/streams?keys=time,distance,altitude,velocity_smooth,heartrate,cadence&key_by_type=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const streams = streamsRes.ok ? await streamsRes.json() : null;

      // Save raw data
      db.insert(stravaRaws).values({
        userId,
        stravaActivityId: stravaId,
        fetchedAt: new Date(),
        stravaMetaJson: JSON.stringify(detailedAct),
      }).run();
      result.downloaded++;

      // Process streams into NormalizedRecord[]
      const records: NormalizedRecord[] = [];
      if (streams?.time) {
        const timeData = streams.time.data;
        for (let i = 0; i < timeData.length; i++) {
          records.push({
            timeSec: timeData[i],
            distanceM: streams.distance?.data[i] ?? 0,
            hr: streams.heartrate?.data[i],
            speedMperS: streams.velocity_smooth?.data[i],
            cadenceRpm: streams.cadence?.data[i] ? streams.cadence.data[i] * 2 : undefined,
            elevationM: streams.altitude?.data[i],
          });
        }
      }

      // 3. Handle Equipment (Gear)
      let equipmentId: string | null = null;
      if (detailedAct.gear_id && detailedAct.gear) {
        // Check if we already have this equipment
        const existingGear = db
          .select()
          .from(equipment)
          .where(and(eq(equipment.userId, userId), eq(equipment.notes, `strava_gear_id:${detailedAct.gear_id}`)))
          .get();

        if (existingGear) {
          equipmentId = existingGear.id;
        } else {
          // Create new equipment based on Strava gear
          const [newGear] = db.insert(equipment).values({
            userId,
            name: detailedAct.gear.name || "Unknown Strava Gear",
            type: "shoe", // Assuming runs use shoes primarily
            notes: `strava_gear_id:${detailedAct.gear_id}`,
          }).returning().all();
          equipmentId = newGear.id;
        }
      }

      // Process and save to activities
      const startedAt = new Date(stravaAct.start_date);
      const { load: trainingLoad, model: loadModel } = estimateTrainingLoadWithModel(
        stravaAct.elapsed_time,
        stravaAct.average_heartrate,
        userProfile
      );

      const sport = "running";

      const insertData = {
        userId,
        equipmentId,
        name: stravaAct.name,
        sport,
        sourceFormat: "strava",
        externalId: stravaId,
        startedAt,
        durationSec: stravaAct.elapsed_time,
        movingTimeSec: stravaAct.moving_time,
        distanceM: stravaAct.distance,
        elevationGainM: stravaAct.total_elevation_gain,
        startLat: stravaAct.start_latlng?.[0] ?? null,
        startLon: stravaAct.start_latlng?.[1] ?? null,
        avgHeartRateBpm: stravaAct.average_heartrate ?? null,
        maxHeartRateBpm: stravaAct.max_heartrate ?? null,
        avgCadenceRpm: stravaAct.average_cadence ?? null,
        avgPaceMperS: stravaAct.average_speed ?? null,
        trainingLoad,
        loadModel,
        rawDataJson: records.length > 0 ? JSON.stringify(records) : null,
      };

      const [created] = db.insert(activities).values(insertData).returning().all();
      result.created++;

      // Process laps if available
      if (detailedAct.laps && Array.isArray(detailedAct.laps)) {
        detailedAct.laps.forEach((lap: any, index: number) => {
          db.insert(activityLaps).values({
            activityId: created.id,
            lapIndex: index,
            startedAt: new Date(lap.start_date),
            durationSec: lap.elapsed_time,
            distanceM: lap.distance,
            avgHeartRateBpm: lap.average_heartrate,
            avgPaceMperS: lap.average_speed,
            avgCadenceRpm: lap.average_cadence ? lap.average_cadence * 2 : null,
            elevationGainM: lap.total_elevation_gain,
          }).run();
        });
      }

      // Enrich with weather
      if (created.startLat != null && created.startLon != null) {
        try {
          const weather = await fetchWeather(created.startLat, created.startLon, created.startedAt);
          if (weather) {
            db.update(activities)
              .set({ weatherJson: JSON.stringify(weather) })
              .where(eq(activities.id, created.id))
              .run();
          }
        } catch { /* ignore */ }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      result.errors.push({ id: stravaId, message });
    }
  }

  return result;
}
