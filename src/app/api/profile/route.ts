import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, activities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";
import { estimateTrainingLoadWithModel } from "@/lib/training/metrics";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user found" }, { status: 500 });

  return NextResponse.json({
    name: user.name,
    hrMax: user.hrMax,
    hrRest: user.hrRest,
    lthrBpm: user.lthrBpm,
    garminEmail: user.garminEmail,
    // Never expose password in GET
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user found" }, { status: 500 });

  const userId = user.id;
  const body = await req.json().catch(() => ({}));

  const hrMax        = typeof body.hrMax        === "number" ? Math.round(body.hrMax)        : null;
  const hrRest       = typeof body.hrRest       === "number" ? Math.round(body.hrRest)       : null;
  const lthrBpm      = typeof body.lthrBpm      === "number" ? Math.round(body.lthrBpm)      : null;
  const name         = typeof body.name         === "string"  ? body.name.trim() || null     : undefined;
  const garminEmail  = typeof body.garminEmail  === "string"  ? body.garminEmail.trim() || null  : undefined;
  const garminPassword = typeof body.garminPassword === "string" ? body.garminPassword || null : undefined;

  // Save profile
  db.update(users)
    .set({
      ...(name !== undefined && { name }),
      hrMax,
      hrRest,
      lthrBpm,
      ...(garminEmail !== undefined && { garminEmail }),
      ...(garminPassword !== undefined && { garminPassword }),
    })
    .where(eq(users.id, userId))
    .run();

  // Recalculate training load for all existing activities with the new profile
  const newProfile = { hrMax, hrRest, lthrBpm };
  const userActivities = db
    .select({ id: activities.id, durationSec: activities.durationSec, avgHeartRateBpm: activities.avgHeartRateBpm })
    .from(activities)
    .where(eq(activities.userId, userId))
    .all();

  for (const act of userActivities) {
    const { load, model } = estimateTrainingLoadWithModel(
      act.durationSec,
      act.avgHeartRateBpm,
      newProfile
    );
    db.update(activities)
      .set({ trainingLoad: load, loadModel: model })
      .where(eq(activities.id, act.id))
      .run();
  }

  return NextResponse.json({ ok: true, recalculated: userActivities.length });
}
