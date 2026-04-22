import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { equipment, activities } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[API/equipment] GET: No user found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch equipment
    const items = db
      .select()
      .from(equipment)
      .where(eq(equipment.userId, user.id))
      .orderBy(desc(equipment.createdAt))
      .all();

    console.log(`[API/equipment] Found ${items.length} shoes for user ${user.id}`);

    // 2. Fetch stats and trends
    const results = items.map((item) => {
      const stats = db
        .select({
          totalDistanceM: sql<number>`COALESCE(SUM(${activities.distanceM}), 0)`,
          avgPaceMperS: sql<number>`COALESCE(AVG(${activities.avgPaceMperS}), 0)`,
        })
        .from(activities)
        .where(eq(activities.equipmentId, item.id))
        .get() ?? { totalDistanceM: 0, avgPaceMperS: 0 };

      const monthExpr = sql`strftime('%Y-%m', datetime(${activities.startedAt} / 1000, 'unixepoch'))`;
      const trend = db
        .select({
          month: monthExpr,
          avgPace: sql<number>`AVG(${activities.avgPaceMperS})`,
        })
        .from(activities)
        .where(eq(activities.equipmentId, item.id))
        .groupBy(monthExpr)
        .orderBy(monthExpr)
        .all();

      return {
        ...item,
        stats: {
          totalDistanceM: stats.totalDistanceM,
          avgPaceMperS: stats.avgPaceMperS,
        },
        trend: trend.map((t) => ({
          name: t.month,
          pace: t.avgPace,
        })),
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("[API/equipment] GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, brand, type, maxDistanceM, purchaseDate, notes } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const newItem = db
    .insert(equipment)
    .values({
      userId: user.id,
      name,
      brand,
      type: type || "shoe",
      maxDistanceM: maxDistanceM ? Number(maxDistanceM) : 800000,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      notes,
    })
    .returning()
    .get();

  return NextResponse.json(newItem);
}
