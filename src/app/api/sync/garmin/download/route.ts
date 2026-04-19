import { NextRequest, NextResponse } from "next/server";
import { downloadGarminActivities } from "@/lib/sync/garmin-download";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user found" }, { status: 500 });

  if (!user.garminEmail || !user.garminPassword) {
    return NextResponse.json(
      { error: "Garmin credentials not configured. Add them on the Profile page." },
      { status: 503 }
    );
  }

  let limit = 500;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.limit === "number") limit = Math.min(body.limit, 200);
  } catch { /* ignore */ }

  try {
    const result = await downloadGarminActivities(user.id, { limit });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    console.error("Garmin download error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
