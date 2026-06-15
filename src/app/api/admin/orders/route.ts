import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" }, take: 100, include: { location: true },
  });
  return NextResponse.json(orders);
}
