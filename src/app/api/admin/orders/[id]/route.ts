import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

// Apaga definitivamente uma encomenda. Se ainda estava a contar (paga/levantada),
// repõe a vaga do horário e a unidade de stock. NÃO faz reembolso (usa "Cancelar" para isso).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { product: true } });
  if (!order) return NextResponse.json({ error: "Não encontrada." }, { status: 404 });

  const ops: any[] = [];
  if (order.status === "paid" || order.status === "picked_up") {
    ops.push(prisma.slot.update({ where: { id: order.slotId }, data: { booked: { decrement: 1 } } }));
    if (order.product.trackStock) ops.push(prisma.product.update({ where: { id: order.productId }, data: { stock: { increment: 1 } } }));
  }
  ops.push(prisma.order.delete({ where: { id: order.id } }));
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true });
}
