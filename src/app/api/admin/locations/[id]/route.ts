import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  const data: any = {};
  for (const k of ["name", "instructions", "active", "sortOrder"]) if (b[k] !== undefined) data[k] = b[k];
  const location = await prisma.location.update({ where: { id: params.id }, data });
  return NextResponse.json(location);
}

// "Remover" = desativar (mantém os horários e o histórico). Reativar: PUT { active: true }.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  await prisma.location.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
