import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }


export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { product: true } });
  if (!order) return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  if (order.status === "cancelled") return NextResponse.json({ error: "Já está cancelada." }, { status: 409 });

  let refunded = false;
  // Reembolso no Stripe (se configurado e se houve pagamento)
  if (stripeConfigured && order.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
      refunded = true;
    } catch (e: any) {
      return NextResponse.json({ error: "Falha no reembolso Stripe: " + (e?.message || "erro") }, { status: 502 });
    }
  }

  // Reverter contadores que foram aplicados no pagamento
  const ops: any[] = [
    prisma.order.update({ where: { id: order.id }, data: { status: "cancelled", cancelledAt: new Date() } }),
  ];
  if (order.status === "paid" || order.status === "picked_up" || order.status === "unpaid") {
    ops.push(prisma.slot.update({ where: { id: order.slotId }, data: { booked: { decrement: 1 } } }));
    if (order.product?.trackStock) ops.push(prisma.product.update({ where: { id: order.productId! }, data: { stock: { increment: 1 } } }));
  }
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true, refunded });
}
