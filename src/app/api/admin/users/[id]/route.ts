import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, activities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const user = db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const update: Record<string, unknown> = {};

  if (typeof body.name === "string") update.name = body.name.trim() || null;
  if (typeof body.email === "string") {
    const trimmed = body.email.trim().toLowerCase();
    const conflict = db.select({ id: users.id }).from(users).where(eq(users.email, trimmed)).get();
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    update.email = trimmed;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    update.hashedPassword = await bcrypt.hash(body.password, 12);
  }
  if (body.hrMax !== undefined) update.hrMax = typeof body.hrMax === "number" ? Math.round(body.hrMax) : null;
  if (body.hrRest !== undefined) update.hrRest = typeof body.hrRest === "number" ? Math.round(body.hrRest) : null;
  if (body.lthrBpm !== undefined) update.lthrBpm = typeof body.lthrBpm === "number" ? Math.round(body.lthrBpm) : null;
  if (body.garminEmail !== undefined) update.garminEmail = typeof body.garminEmail === "string" ? body.garminEmail.trim() || null : null;
  if (body.garminPassword !== undefined) update.garminPassword = typeof body.garminPassword === "string" ? body.garminPassword || null : null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  db.update(users).set(update).where(eq(users.id, id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const allUsers = db.select({ id: users.id }).from(users).all();
  if (allUsers.length <= 1) {
    return NextResponse.json({ error: "Cannot delete the last user" }, { status: 400 });
  }

  const user = db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const actCount = db.select({ id: activities.id }).from(activities).where(eq(activities.userId, id)).all().length;

  db.delete(users).where(eq(users.id, id)).run();

  return NextResponse.json({ ok: true, deletedActivities: actCount });
}
