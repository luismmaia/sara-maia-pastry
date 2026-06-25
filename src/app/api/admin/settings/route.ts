import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export const dynamic = "force-dynamic";

const KEYS = ["lastMinuteHours", "orderNotifyEmails", "emailCustomerEnabled", "emailOwnerEnabled", "emailSignature", "emailReplyTo"];
const DEFAULTS: Record<string, string> = {
  lastMinuteHours: "24", orderNotifyEmails: "", emailCustomerEnabled: "1", emailOwnerEnabled: "1", emailSignature: "", emailReplyTo: "",
};

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  const out: Record<string, string> = {};
  for (const k of KEYS) out[k] = map[k] ?? DEFAULTS[k];
  // pistas úteis para a interface (sem expor segredos)
  return NextResponse.json({ ...out, _resendConfigured: !!process.env.RESEND_API_KEY, _emailFrom: process.env.EMAIL_FROM || "" });
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  for (const k of KEYS) {
    if (b[k] === undefined) continue;
    let v = String(b[k]);
    if (k === "lastMinuteHours") v = String(parseInt(v, 10) || 24);
    await prisma.setting.upsert({ where: { key: k }, update: { value: v }, create: { key: k, value: v } });
  }
  return NextResponse.json({ ok: true });
}
