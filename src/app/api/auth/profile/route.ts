import { prisma } from "@/lib/prisma";
import { verifyUserToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const uid = await verifyUserToken(cookies().get("sm_user")?.value);
  if (!uid) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  const user = await prisma.user.update({
    where: { id: uid },
    data: { name: b.name ?? undefined, phone: b.phone ?? undefined, nif: b.nif ?? undefined },
  });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, nif: user.nif } });
}
