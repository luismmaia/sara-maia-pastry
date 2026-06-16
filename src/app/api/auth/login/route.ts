import { prisma } from "@/lib/prisma";
import { signUserToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const b = await req.json();
  const email = (b.email || "").trim().toLowerCase();
  const password = b.password || "";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email ou palavra-passe incorretos." }, { status: 401 });
  }
  const token = await signUserToken(user.id);
  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, nif: user.nif } });
  res.cookies.set("sm_user", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
