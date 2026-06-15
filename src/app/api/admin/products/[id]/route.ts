import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  const data: any = {};
  for (const k of ["namePt","nameEn","descPt","descEn","catPt","catEn","leadDays","active","sortOrder","trackStock","stock"]) {
    if (b[k] !== undefined) data[k] = b[k];
  }
  if (b.basePrice !== undefined) data.basePrice = Math.round(b.basePrice * 100);
  const product = await prisma.product.update({ where: { id: params.id }, data });
  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
