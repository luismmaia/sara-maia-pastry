import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function GET() {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const products = await prisma.product.findMany({
    orderBy: { sortOrder: "asc" },
    include: { photos: { orderBy: { sortOrder: "asc" } }, options: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();
  const product = await prisma.product.create({
    data: {
      namePt: b.namePt, nameEn: b.nameEn || b.namePt,
      descPt: b.descPt || "", descEn: b.descEn || b.descPt || "",
      catPt: b.catPt || "", catEn: b.catEn || b.catPt || "",
      basePrice: Math.round((b.basePrice || 0) * 100),
      leadDays: b.leadDays ?? 2,
      trackStock: !!b.trackStock,
      stock: b.trackStock ? (b.stock ?? 0) : null,
      dedicatedSlotsOnly: !!b.dedicatedSlotsOnly,
      photos: { create: (b.photos || []).map((u: string, i: number) => ({ url: u, sortOrder: i })) },
      options: { create: (b.options || []).map((o: any, i: number) => ({
        kind: o.kind, labelPt: o.labelPt, labelEn: o.labelEn || o.labelPt,
        choicePt: o.choicePt, choiceEn: o.choiceEn || o.choicePt,
        priceDelta: Math.round((o.priceDelta || 0) * 100), sortOrder: i,
      })) },
    },
  });
  return NextResponse.json(product);
}
