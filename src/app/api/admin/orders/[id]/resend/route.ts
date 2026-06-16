import { prisma } from "@/lib/prisma";
import { sendOrderEmails } from "@/lib/email";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }


export async function POST(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { location: true } });
  if (!order) return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  await sendOrderEmails({
    productName: order.productName, sizeLabel: order.sizeLabel, decoLabel: order.decoLabel,
    total: order.total, pickupAt: order.pickupAt, locationName: order.location.name,
    locationInstructions: order.location.instructions,
    customerName: order.customerName, customerEmail: order.customerEmail,
  });
  return NextResponse.json({ ok: true });
}
