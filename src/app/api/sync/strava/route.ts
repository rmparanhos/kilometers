import { NextResponse } from "next/server";
import { syncStravaActivities } from "@/lib/sync/strava";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user found" }, { status: 401 });

  if (!user.stravaRefreshToken) {
    return NextResponse.json(
      { error: "Strava not connected. Connect it on the Profile page." },
      { status: 400 }
    );
  }

  try {
    const result = await syncStravaActivities(user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("Strava sync error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
