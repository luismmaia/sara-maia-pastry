import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { translatePtToEn } from "@/lib/translate";
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
  const namePt = b.namePt, descPt = b.descPt || "", catPt = b.catPt || "";
  const nameEn = b.nameEn?.trim() ? b.nameEn : await translatePtToEn(namePt);
  const descEn = b.descEn?.trim() ? b.descEn : await translatePtToEn(descPt);
  const catEn = b.catEn?.trim() ? b.catEn : await translatePtToEn(catPt);
  const product = await prisma.product.create({
    data: {
      namePt, nameEn,
      descPt, descEn,
      catPt, catEn,
      basePrice: Math.round((b.basePrice || 0) * 100),
      leadHours: b.leadHours ?? 24,
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
