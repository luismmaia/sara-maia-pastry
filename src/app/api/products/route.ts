import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Ler sempre os dados atuais da base de dados (sem cache de build).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { photos: { orderBy: { sortOrder: "asc" } }, options: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(products);
}
