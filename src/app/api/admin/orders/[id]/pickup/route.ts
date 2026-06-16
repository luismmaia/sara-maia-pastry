import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }


export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  if (order.status !== "paid") return NextResponse.json({ error: "Só encomendas pagas podem ser marcadas como levantadas." }, { status: 409 });
  const updated = await prisma.order.update({ where: { id: params.id }, data: { status: "picked_up", pickedUpAt: new Date() } });
  return NextResponse.json(updated);
}
