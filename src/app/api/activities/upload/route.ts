import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseFitBuffer, extractActivityFromFit } from "@/lib/parsers/fit";
import { parseGpxString, extractActivityFromGpx } from "@/lib/parsers/gpx";
import { normalizeToActivityInsert } from "@/lib/parsers/normalize";
import { estimateTrainingLoadWithModel } from "@/lib/training/metrics";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fetchWeather } from "@/lib/weather";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user found" }, { status: 500 });

  const userId = user.id;
  const userProfile = db.select({ hrMax: users.hrMax, hrRest: users.hrRest, lthrBpm: users.lthrBpm })
    .from(users).where(eq(users.id, userId)).get() ?? {};

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filename = file.name.toLowerCase();
  const format = filename.endsWith(".fit")
    ? "fit"
    : filename.endsWith(".gpx")
    ? "gpx"
    : null;

  if (!format) {
    return NextResponse.json(
      { error: "Unsupported file format. Use .fit or .gpx" },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsed;
    if (format === "fit") {
      const fitData = await parseFitBuffer(buffer);
      parsed = extractActivityFromFit(fitData);
    } else {
      const gpxData = parseGpxString(buffer.toString("utf-8"));
      parsed = extractActivityFromGpx(gpxData);
    }

    const { load: trainingLoad, model: loadModel } = estimateTrainingLoadWithModel(
      parsed.durationSec,
      parsed.avgHeartRateBpm,
      userProfile
    );

    const insertData = normalizeToActivityInsert(parsed, userId, {
      sourceFile: file.name,
      sourceFormat: format,
      trainingLoad,
      loadModel,
    });

    const [created] = db.insert(activities).values(insertData).returning().all();

    // Best-effort weather enrichment — never fails the upload
    if (created.startLat != null && created.startLon != null) {
      try {
        const weather = await fetchWeather(created.startLat, created.startLon, created.startedAt);
        if (weather) {
          db.update(activities)
            .set({ weatherJson: JSON.stringify(weather) })
            .where(eq(activities.id, created.id))
            .run();
        }
      } catch {
        // silently ignore weather fetch errors
      }
    }

    return NextResponse.json({ activity: created }, { status: 201 });
  } catch (err) {
    console.error("Upload parse error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to parse activity file",
      },
      { status: 422 }
    );
  }
}
