import { NextResponse } from "next/server";
import { recalculateFromRaws } from "@/lib/sync/garmin-recalculate";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user found" }, { status: 500 });

  try {
    const result = await recalculateFromRaws(user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recalculate failed";
    console.error("Garmin recalculate error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
