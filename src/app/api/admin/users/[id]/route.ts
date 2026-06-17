import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }
export const dynamic = "force-dynamic";

// Detalhe do utilizador + as suas encomendas (por userId OU pelo email)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: user.id }, { customerEmail: user.email }] },
    orderBy: { pickupAt: "desc" },
    include: { location: { select: { name: true } } },
  });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, nif: user.nif, createdAt: user.createdAt }, orders });
}

// Apagar a conta. As encomendas mantêm-se (ficam como convidado: userId a null).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  await prisma.$transaction([
    prisma.order.updateMany({ where: { userId: params.id }, data: { userId: null } }),
    prisma.user.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
