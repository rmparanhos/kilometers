import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { equipment } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, brand, type, maxDistanceM, purchaseDate, retiredAt, notes } = body;

  const updated = db
    .update(equipment)
    .set({
      name,
      brand,
      type,
      maxDistanceM: maxDistanceM ? Number(maxDistanceM) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      retiredAt: retiredAt ? new Date(retiredAt) : null,
      notes,
    })
    .where(and(eq(equipment.id, id), eq(equipment.userId, user.id)))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const deleted = db
    .delete(equipment)
    .where(and(eq(equipment.id, id), eq(equipment.userId, user.id)))
    .returning()
    .get();

  if (!deleted) {
    return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
