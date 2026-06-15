import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const locations = await prisma.location.findMany({ orderBy: { sortOrder: "asc" } });
  const slots = await prisma.slot.findMany({ orderBy: { startsAt: "asc" }, where: { startsAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } });
  return NextResponse.json({ locations, slots });
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json(); // { locationId, startsAt (ISO), capacity }
  const slot = await prisma.slot.create({
    data: { locationId: b.locationId, startsAt: new Date(b.startsAt), capacity: b.capacity ?? 1 },
  });
  return NextResponse.json(slot);
}

export async function DELETE(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await req.json();
  await prisma.slot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
