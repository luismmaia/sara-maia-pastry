import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { translatePtToEn } from "@/lib/translate";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { namePt, descPt, catPt } = await req.json();
  const [nameEn, descEn, catEn] = await Promise.all([
    translatePtToEn(namePt || ""),
    translatePtToEn(descPt || ""),
    translatePtToEn(catPt || ""),
  ]);
  return NextResponse.json({ nameEn, descEn, catEn });
}
