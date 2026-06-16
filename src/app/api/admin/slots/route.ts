import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const locations = await prisma.location.findMany({ orderBy: { sortOrder: "asc" } });
  const slots = await prisma.slot.findMany({
    orderBy: { startsAt: "asc" },
    where: { startsAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    include: { product: { select: { id: true, namePt: true } } },
  });
  // lista de produtos para o seletor de horário dedicado
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, namePt: true } });
  return NextResponse.json({ locations, slots, products });
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json(); // { locationId, startsAtList: string[], capacity, productId? }
  const list: string[] = b.startsAtList || (b.startsAt ? [b.startsAt] : []);
  const created = await prisma.$transaction(
    list.map((iso) => prisma.slot.create({
      data: {
        locationId: b.locationId,
        productId: b.productId || null,
        startsAt: new Date(iso),
        capacity: b.capacity ?? 1,
      },
    }))
  );
  return NextResponse.json({ created: created.length });
}

export async function DELETE(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await req.json();
  const cnt = await prisma.order.count({ where: { slotId: id } });
  if (cnt > 0) return NextResponse.json({ error: `Este horário tem ${cnt} encomenda(s) associada(s). Apaga ou cancela essas encomendas primeiro (no separador Encomendas).` }, { status: 409 });
  await prisma.slot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
