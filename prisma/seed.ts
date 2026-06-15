import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const U = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

async function main() {
  // Idempotente: se já houver produtos, não volta a semear (evita duplicados a cada deploy).
  const existing = await db.product.count();
  if (existing > 0) {
    console.log(`Seed ignorado: já existem ${existing} produtos.`);
    return;
  }

  // Locais (upsert por slug, para não duplicar)
  const maia = await db.location.upsert({
    where: { slug: "maia" }, update: {},
    create: { name: "Atelier · Maia", slug: "maia", sortOrder: 0 },
  });
  await db.location.upsert({
    where: { slug: "porto" }, update: {},
    create: { name: "Ponto · Porto", slug: "porto", sortOrder: 1, active: true },
  });

  const items = [
    { namePt: "Tarte de Frutos Vermelhos", nameEn: "Red Berry Tart", catPt: "frutos vermelhos", catEn: "red berries",
      descPt: "Massa areada, creme de baunilha e frutos vermelhos frescos.", descEn: "Shortcrust, vanilla cream and fresh red berries.",
      basePrice: 3400, leadDays: 2, photos: ["photo-1565958011703-44f9829ba187","photo-1488477181946-6428a0291777"] },
    { namePt: "Entremet de Chocolate Negro", nameEn: "Dark Chocolate Entremet", catPt: "chocolate", catEn: "chocolate",
      descPt: "Mousse de chocolate 70%, crocante de avelã e ganache.", descEn: "70% chocolate mousse, hazelnut crunch and ganache.",
      basePrice: 3800, leadDays: 2, photos: ["photo-1578985545062-69928b1d9587"] },
    { namePt: "Pavlova de Época", nameEn: "Seasonal Pavlova", catPt: "da época", catEn: "seasonal",
      descPt: "Merengue estaladiço, chantilly e fruta da estação.", descEn: "Crisp meringue, whipped cream and seasonal fruit.",
      basePrice: 3000, leadDays: 0, photos: ["photo-1551024601-bec78aea704b"] },
    { namePt: "Tarte de Limão Merengada", nameEn: "Lemon Meringue Tart", catPt: "cítrico", catEn: "citrus",
      descPt: "Creme de limão, merengue tostado e raspa fresca.", descEn: "Lemon curd, torched meringue and fresh zest.",
      basePrice: 3000, leadDays: 1, photos: ["photo-1488477181946-6428a0291777"] },
    { namePt: "Red Velvet", nameEn: "Red Velvet", catPt: "clássico", catEn: "classic",
      descPt: "Massa aveludada e cobertura de queijo creme.", descEn: "Velvety sponge and cream cheese frosting.",
      basePrice: 3200, leadDays: 2, trackStock: true, stock: 6, photos: ["photo-1565958011703-44f9829ba187"] },
    { namePt: "Cheesecake de Frutos Vermelhos", nameEn: "Red Berry Cheesecake", catPt: "frutos vermelhos", catEn: "red berries",
      descPt: "Base de bolacha, queijo cremoso e coulis de frutos vermelhos.", descEn: "Biscuit base, creamy cheese and red berry coulis.",
      basePrice: 3100, leadDays: 1, photos: ["photo-1464349095431-e9a21285b5f3"] },
  ];

  for (const [i, it] of items.entries()) {
    await db.product.create({
      data: {
        namePt: it.namePt, nameEn: it.nameEn, catPt: it.catPt, catEn: it.catEn,
        descPt: it.descPt, descEn: it.descEn, basePrice: it.basePrice, leadDays: it.leadDays, sortOrder: i,
        trackStock: (it as any).trackStock ?? false, stock: (it as any).stock ?? null,
        photos: { create: it.photos.map((p, j) => ({ url: U(p), sortOrder: j })) },
        options: {
          create: [
            { kind: "size", labelPt: "Tamanho", labelEn: "Size", choicePt: "20 cm · 8 fatias", choiceEn: "20 cm · 8 slices", priceDelta: 0, sortOrder: 0 },
            { kind: "size", labelPt: "Tamanho", labelEn: "Size", choicePt: "24 cm · 12 fatias", choiceEn: "24 cm · 12 slices", priceDelta: 800, sortOrder: 1 },
            { kind: "deco", labelPt: "Decoração", labelEn: "Decoration", choicePt: "Clássico", choiceEn: "Classic", priceDelta: 0, sortOrder: 0 },
            { kind: "deco", labelPt: "Decoração", labelEn: "Decoration", choicePt: "Flores comestíveis", choiceEn: "Edible flowers", priceDelta: 600, sortOrder: 1 },
            { kind: "deco", labelPt: "Decoração", labelEn: "Decoration", choicePt: "Frutos vermelhos", choiceEn: "Red berries", priceDelta: 400, sortOrder: 2 },
          ],
        },
      },
    });
  }

  // Horários de levantamento na Maia (próximos dias)
  const now = new Date();
  for (const off of [2, 3, 5, 6, 9, 10]) {
    for (const [h, m] of [[10, 30], [16, 30], [18, 0]] as const) {
      const d = new Date(now); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0);
      await db.slot.create({ data: { locationId: maia.id, startsAt: d, capacity: 3, booked: 0 } });
    }
  }
  console.log("Seed concluído.");
}

// Nunca falhar o deploy por causa do seed: regista o erro mas sai com sucesso.
main()
  .catch((e) => { console.error("Seed: aviso —", e?.message || e); })
  .finally(() => db.$disconnect());
