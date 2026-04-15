import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities, activityLaps } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No user found" }, { status: 500 });

  const userId = user.id;

  // Fetch activity IDs first, then delete laps explicitly before activities.
  const userActivityIds = db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.userId, userId))
    .all()
    .map((r) => r.id);

  if (userActivityIds.length > 0) {
    db.delete(activityLaps)
      .where(inArray(activityLaps.activityId, userActivityIds))
      .run();
  }

  const deleted = db
    .delete(activities)
    .where(eq(activities.userId, userId))
    .run();

  return NextResponse.json({ deleted: deleted.changes });
}
