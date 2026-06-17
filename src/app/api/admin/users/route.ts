import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, phone: true, nif: true, createdAt: true, _count: { select: { orders: true } } },
  });
  return NextResponse.json(users);
}
