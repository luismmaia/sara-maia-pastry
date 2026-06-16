import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  return NextResponse.json({ lastMinuteHours: map.lastMinuteHours ?? "24" });
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  if (b.lastMinuteHours !== undefined) {
    const v = String(parseInt(b.lastMinuteHours, 10) || 24);
    await prisma.setting.upsert({ where: { key: "lastMinuteHours" }, update: { value: v }, create: { key: "lastMinuteHours", value: v } });
  }
  return NextResponse.json({ ok: true });
}
