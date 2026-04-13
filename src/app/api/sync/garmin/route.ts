import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { syncGarminActivities } from "@/lib/sync/garmin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GARMIN_EMAIL || !process.env.GARMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Garmin credentials not configured. Set GARMIN_EMAIL and GARMIN_PASSWORD in .env.local." },
      { status: 503 }
    );
  }

  const userId = (session.user as { id: string }).id;

  // Optional: limit override from request body
  let limit = 30;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.limit === "number") limit = Math.min(body.limit, 200);
  } catch {
    // ignore
  }

  try {
    const result = await syncGarminActivities(userId, { limit });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("Garmin sync error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
