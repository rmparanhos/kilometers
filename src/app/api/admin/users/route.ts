import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";

export async function GET() {
  const all = db
    .select({
      id: users.id,
      name: users.name,
      hrMax: users.hrMax,
      hrRest: users.hrRest,
      lthrBpm: users.lthrBpm,
      garminEmail: users.garminEmail,
      createdAt: users.createdAt,
    })
    .from(users)
    .all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const name = typeof body.name === "string" ? body.name.trim() : null;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  // Internal credentials — never used for login in this self-hosted setup
  const email = `user-${crypto.randomUUID()}@local`;
  const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 10);

  const hrMax   = typeof body.hrMax   === "number" ? Math.round(body.hrMax)   : null;
  const hrRest  = typeof body.hrRest  === "number" ? Math.round(body.hrRest)  : null;
  const lthrBpm = typeof body.lthrBpm === "number" ? Math.round(body.lthrBpm) : null;
  const garminEmail    = typeof body.garminEmail    === "string" ? body.garminEmail.trim()    || null : null;
  const garminPassword = typeof body.garminPassword === "string" ? body.garminPassword        || null : null;

  const inserted = db
    .insert(users)
    .values({ name, email, hashedPassword, hrMax, hrRest, lthrBpm, garminEmail, garminPassword })
    .returning({ id: users.id })
    .get();

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
}
