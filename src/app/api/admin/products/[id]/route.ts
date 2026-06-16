import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();

  // Espelhar PT -> EN (a loja é bilingue, mas os textos são geridos só em PT)
  const data: any = {};
  if (b.namePt !== undefined) { data.namePt = b.namePt; data.nameEn = b.nameEn ?? b.namePt; }
  if (b.descPt !== undefined) { data.descPt = b.descPt; data.descEn = b.descEn ?? b.descPt; }
  if (b.catPt !== undefined)  { data.catPt = b.catPt;  data.catEn = b.catEn ?? b.catPt; }
  for (const k of ["leadDays", "active", "sortOrder", "trackStock", "dedicatedSlotsOnly"]) if (b[k] !== undefined) data[k] = b[k];
  if (b.basePrice !== undefined) data.basePrice = Math.round(b.basePrice * 100);
  if (b.trackStock !== undefined) data.stock = b.trackStock ? (b.stock ?? 0) : null;

  // Substituir opções e fotos quando enviadas
  const ops: any[] = [prisma.product.update({ where: { id: params.id }, data })];

  if (Array.isArray(b.options)) {
    ops.push(prisma.productOption.deleteMany({ where: { productId: params.id } }));
    b.options.forEach((o: any, i: number) => {
      ops.push(prisma.productOption.create({
        data: {
          productId: params.id, kind: o.kind, labelPt: o.labelPt, labelEn: o.labelEn ?? o.labelPt,
          choicePt: o.choicePt, choiceEn: o.choiceEn ?? o.choicePt,
          priceDelta: Math.round((o.priceDelta || 0) * 100), sortOrder: o.sortOrder ?? i,
        },
      }));
    });
  }
  if (Array.isArray(b.photos)) {
    ops.push(prisma.productPhoto.deleteMany({ where: { productId: params.id } }));
    b.photos.forEach((url: string, i: number) => {
      ops.push(prisma.productPhoto.create({ data: { productId: params.id, url, sortOrder: i } }));
    });
  }
  await prisma.$transaction(ops);

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { photos: { orderBy: { sortOrder: "asc" } }, options: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(product);
}

// "Remover" = desativar (mantém o histórico de encomendas). Para reativar, usa PUT { active: true }.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  await prisma.product.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
