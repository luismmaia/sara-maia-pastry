import { signAdminToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Palavra-passe incorreta." }, { status: 401 });
  }
  const token = await signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sm_admin", token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return res;
}
