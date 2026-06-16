import { prisma } from "@/lib/prisma";
import { getVendusInvoiceUrl } from "@/lib/vendus";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }


export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
  if (order.vendusInvoiceUrl) return NextResponse.json({ url: order.vendusInvoiceUrl });
  if (!order.vendusInvoiceId) return NextResponse.json({ error: "Sem fatura associada." }, { status: 404 });
  const url = await getVendusInvoiceUrl(order.vendusInvoiceId);
  if (url) await prisma.order.update({ where: { id: order.id }, data: { vendusInvoiceUrl: url } });
  return NextResponse.json({ url, id: order.vendusInvoiceId });
}
