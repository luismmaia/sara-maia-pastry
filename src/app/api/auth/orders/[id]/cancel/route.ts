import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { verifyUserToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const uid = await verifyUserToken(cookies().get("sm_user")?.value);
  if (!uid) return NextResponse.json({ error: "auth" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { product: true } });
  if (!order || (order.userId !== uid && order.customerEmail !== user.email)) {
    return NextResponse.json({ error: "Encomenda não encontrada." }, { status: 404 });
  }
  if (order.status !== "paid") return NextResponse.json({ error: "Esta encomenda não pode ser cancelada." }, { status: 409 });
  if (order.pickupAt < new Date()) return NextResponse.json({ error: "O horário de levantamento já passou." }, { status: 409 });

  if (stripeConfigured && order.stripePaymentIntentId) {
    try { await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId }); }
    catch (e: any) { return NextResponse.json({ error: "Falha no reembolso: " + (e?.message || "erro") }, { status: 502 }); }
  }
  const ops: any[] = [
    prisma.order.update({ where: { id: order.id }, data: { status: "cancelled", cancelledAt: new Date() } }),
    prisma.slot.update({ where: { id: order.slotId }, data: { booked: { decrement: 1 } } }),
  ];
  if (order.product?.trackStock) ops.push(prisma.product.update({ where: { id: order.productId! }, data: { stock: { increment: 1 } } }));
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true });
}
