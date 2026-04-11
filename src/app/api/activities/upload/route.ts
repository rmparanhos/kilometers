import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { parseFitBuffer, extractActivityFromFit } from "@/lib/parsers/fit";
import { parseGpxString, extractActivityFromGpx } from "@/lib/parsers/gpx";
import { normalizeToActivityInsert } from "@/lib/parsers/normalize";
import {
  estimateHrTSS,
  estimateLoadFromDuration,
} from "@/lib/training/metrics";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

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

    // Calculate training load (hrTSS if HR available, else duration-based estimate)
    const trainingLoad =
      parsed.avgHeartRateBpm != null
        ? estimateHrTSS(parsed.durationSec, parsed.avgHeartRateBpm)
        : estimateLoadFromDuration(parsed.durationSec);

    const insertData = normalizeToActivityInsert(parsed, userId, {
      sourceFile: file.name,
      sourceFormat: format,
      trainingLoad,
    });

    const [created] = db.insert(activities).values(insertData).returning().all();

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
