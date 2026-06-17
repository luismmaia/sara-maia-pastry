import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { translatePtToEn } from "@/lib/translate";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json();

  // Espelhar PT -> EN (a loja é bilingue, mas os textos são geridos só em PT)
  const data: any = {};
  if (b.namePt !== undefined) { data.namePt = b.namePt; data.nameEn = b.nameEn?.trim() ? b.nameEn : await translatePtToEn(b.namePt); }
  if (b.descPt !== undefined) { data.descPt = b.descPt; data.descEn = b.descEn?.trim() ? b.descEn : await translatePtToEn(b.descPt); }
  if (b.catPt !== undefined)  { data.catPt = b.catPt;  data.catEn = b.catEn?.trim() ? b.catEn : await translatePtToEn(b.catPt); }
  for (const k of ["leadHours", "active", "sortOrder", "trackStock", "dedicatedSlotsOnly"]) if (b[k] !== undefined) data[k] = b[k];
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

// Apagar definitivamente — só permitido se o produto não tiver encomendas associadas.
// (Apaga em cascata fotos, opções e horários dedicados.) Para esconder mantendo histórico, usa desativar.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const cnt = await prisma.order.count({ where: { productId: params.id } });
  if (cnt > 0) return NextResponse.json({ error: `Este produto tem ${cnt} encomenda(s) associada(s). Não pode ser apagado — podes desativá-lo.` }, { status: 409 });
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
