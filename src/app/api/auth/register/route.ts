import { prisma } from "@/lib/prisma";
import { signUserToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const b = await req.json();
  const email = (b.email || "").trim().toLowerCase();
  const password = b.password || "";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "A palavra-passe deve ter pelo menos 6 caracteres." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Já existe uma conta com este email. Tenta entrar." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: b.name || null, phone: b.phone || null, nif: b.nif || null },
  });

  // Associar encomendas anteriores feitas como convidado com o mesmo email
  await prisma.order.updateMany({ where: { customerEmail: email, userId: null }, data: { userId: user.id } });

  const token = await signUserToken(user.id);
  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, nif: user.nif } });
  res.cookies.set("sm_user", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
