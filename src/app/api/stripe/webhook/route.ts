import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createVendusInvoice } from "@/lib/vendus";
import { sendOrderEmails } from "@/lib/email";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new NextResponse(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as any;
    const orderId = pi.metadata?.orderId;
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: { location: true, product: true } });
      if (order && order.status !== "paid") {
        const ops: any[] = [
          prisma.order.update({ where: { id: order.id }, data: { status: "paid" } }),
          prisma.slot.update({ where: { id: order.slotId }, data: { booked: { increment: 1 } } }),
        ];
        // Stock limitado: abater 1 unidade (sem ficar negativo)
        if (order.product.trackStock && (order.product.stock ?? 0) > 0) {
          ops.push(prisma.product.update({ where: { id: order.productId }, data: { stock: { decrement: 1 } } }));
        }
        await prisma.$transaction(ops);
        // Fatura Vendus (se configurado)
        const invoiceId = await createVendusInvoice({
          productName: order.productName, total: order.total,
          customerName: order.customerName, customerEmail: order.customerEmail, nif: order.nif,
        });
        if (invoiceId) await prisma.order.update({ where: { id: order.id }, data: { vendusInvoiceId: invoiceId } });
        // Emails (se configurado)
        await sendOrderEmails({
          productName: order.productName, sizeLabel: order.sizeLabel, decoLabel: order.decoLabel,
          total: order.total, pickupAt: order.pickupAt, locationName: order.location.name,
          locationInstructions: order.location.instructions,
          customerName: order.customerName, customerEmail: order.customerEmail,
        });
      }
    }
  }
  return NextResponse.json({ received: true });
}
