import { prisma } from "@/lib/prisma";
import { verifyUserToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await verifyUserToken(cookies().get("sm_user")?.value);
  if (!uid) return NextResponse.json({ error: "auth" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["paid", "unpaid", "picked_up", "cancelled"] },
      OR: [{ userId: uid }, { customerEmail: user.email }],
    },
    orderBy: { pickupAt: "desc" },
    include: { location: { select: { name: true, instructions: true } } },
  });
  return NextResponse.json(orders);
}
