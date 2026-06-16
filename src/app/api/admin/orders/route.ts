import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { status: { in: ["paid", "unpaid", "picked_up", "cancelled"] } },
    orderBy: { pickupAt: "asc" },
    take: 800,
    include: { location: { select: { name: true } } },
  });
  return NextResponse.json(orders);
}

// Criar encomenda MANUAL (sem produto, ligada a um horário). Pode ficar "unpaid".
export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  if (!b.description || !b.slotId || b.price === undefined || b.price === "") {
    return NextResponse.json({ error: "Indica descrição, preço e horário." }, { status: 400 });
  }
  const slot = await prisma.slot.findUnique({ where: { id: b.slotId } });
  if (!slot) return NextResponse.json({ error: "Horário inválido." }, { status: 404 });

  const total = Math.round(parseFloat(b.price) * 100);
  const status = b.status === "unpaid" ? "unpaid" : "paid";

  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        isManual: true, productId: null, productName: b.description,
        unitPrice: total, total,
        locationId: slot.locationId, slotId: slot.id, pickupAt: slot.startsAt,
        customerName: b.customerName || "—", customerPhone: b.customerPhone || "", customerEmail: b.customerEmail || "",
        nif: b.nif || null, wantInvoice: !!b.nif, status,
      },
    }),
    prisma.slot.update({ where: { id: slot.id }, data: { booked: { increment: 1 } } }),
  ]);
  return NextResponse.json(order);
}
