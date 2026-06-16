import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!stripeConfigured) {
    return NextResponse.json({ error: "Pagamentos ainda não configurados (modo de testes de design)." }, { status: 503 });
  }
  const b = await req.json();
  const { productId, optionIds, slotId, customer } = b;

  if (!productId || !slotId || !customer?.name || !customer?.phone || !customer?.email) {
    return NextResponse.json({ error: "Dados em falta." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId }, include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product || !product.active) return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });

  // Ordem dos grupos (kinds) tal como aparecem nas opções do produto
  const groupOrder: string[] = [];
  for (const o of product.options) if (!groupOrder.includes(o.kind)) groupOrder.push(o.kind);

  // Preço calculado SEMPRE no servidor (nunca confiar no preço do cliente)
  let total = product.basePrice;
  const chosenByGroup: Record<string, string> = {}; // kind -> choicePt
  for (const optId of (optionIds || [])) {
    if (!optId) continue;
    const o = product.options.find((x) => x.id === optId);
    if (!o) return NextResponse.json({ error: "Opção inválida." }, { status: 400 });
    total += o.priceDelta;
    chosenByGroup[o.kind] = o.choicePt;
  }
  // Exige uma escolha por cada grupo do produto
  for (const k of groupOrder) {
    if (!chosenByGroup[k]) return NextResponse.json({ error: "Faltam personalizações por escolher." }, { status: 400 });
  }
  // Guarda os rótulos nos 2 campos de snapshot (1.º e 2.º grupo)
  const sizeLabel: string | null = groupOrder[0] ? chosenByGroup[groupOrder[0]] : null;
  const decoLabel: string | null = groupOrder[1] ? chosenByGroup[groupOrder[1]] : null;

  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { location: true } });
  if (!slot || !slot.active || slot.startsAt < new Date() || slot.booked >= slot.capacity) {
    return NextResponse.json({ error: "Horário já não está disponível." }, { status: 409 });
  }

  // Compatibilidade horário ↔ produto:
  // - um horário dedicado a outro produto não pode ser usado
  if (slot.productId && slot.productId !== product.id) {
    return NextResponse.json({ error: "Este horário não está disponível para este bolo." }, { status: 409 });
  }
  // - um produto "só horários dedicados" não pode usar horários gerais
  if (product.dedicatedSlotsOnly && slot.productId !== product.id) {
    return NextResponse.json({ error: "Este bolo só pode ser levantado nos seus horários próprios." }, { status: 409 });
  }

  // Tempo de produção: o levantamento tem de respeitar a antecedência mínima do produto
  const minPickup = new Date(); minPickup.setHours(0, 0, 0, 0);
  minPickup.setDate(minPickup.getDate() + product.leadDays);
  if (slot.startsAt < minPickup) {
    return NextResponse.json({ error: "Este bolo precisa de mais tempo de produção. Escolhe uma data mais tarde." }, { status: 409 });
  }

  // Stock limitado: tem de haver unidades disponíveis
  if (product.trackStock && (product.stock ?? 0) <= 0) {
    return NextResponse.json({ error: "Produto esgotado." }, { status: 409 });
  }

  const order = await prisma.order.create({
    data: {
      productId, productName: product.namePt, sizeLabel, decoLabel,
      unitPrice: total, total,
      locationId: slot.locationId, slotId: slot.id, pickupAt: slot.startsAt,
      customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email,
      nif: customer.nif || null, wantInvoice: !!customer.wantInvoice, status: "pending",
    },
  });

  const intent = await stripe.paymentIntents.create({
    amount: total, currency: "eur",
    automatic_payment_methods: { enabled: true }, // Cartão, MB WAY, Revolut Pay, Apple/Google Pay
    metadata: { orderId: order.id },
    receipt_email: customer.email,
  });

  await prisma.order.update({ where: { id: order.id }, data: { stripePaymentIntentId: intent.id } });
  return NextResponse.json({ clientSecret: intent.client_secret, orderId: order.id });
}
