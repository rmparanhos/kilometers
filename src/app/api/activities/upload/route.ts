import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: parse uploaded .fit / .gpx file and insert into activities table
  void req;
  return NextResponse.json({ message: "Upload endpoint — coming soon" }, { status: 501 });
}
