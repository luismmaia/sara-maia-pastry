import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const orders = await prisma.order.findMany({
    where: { status: { in: ["paid", "picked_up", "cancelled"] } },
    orderBy: { pickupAt: "asc" },
    take: 800,
    include: { location: { select: { name: true } } },
  });
  return NextResponse.json(orders);
}
