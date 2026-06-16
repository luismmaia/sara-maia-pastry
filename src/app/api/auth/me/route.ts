import { prisma } from "@/lib/prisma";
import { verifyUserToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await verifyUserToken(cookies().get("sm_user")?.value);
  if (!uid) return NextResponse.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, nif: user.nif } });
}
