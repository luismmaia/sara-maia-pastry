import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "local";
}

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const locations = await prisma.location.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(locations);
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: "Indica o nome." }, { status: 400 });
  const count = await prisma.location.count();
  const slug = `${slugify(b.name)}-${Date.now().toString(36).slice(-4)}`;
  const location = await prisma.location.create({
    data: { name: b.name, instructions: b.instructions || "", slug, sortOrder: count },
  });
  return NextResponse.json(location);
}
