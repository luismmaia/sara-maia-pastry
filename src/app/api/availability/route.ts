import { prisma } from "@/lib/prisma";
import { getLastMinuteHours } from "@/lib/settings";
import { NextResponse } from "next/server";

// Ler sempre os dados atuais (horários abertos/fechados em tempo real).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const locations = await prisma.location.findMany({
    where: { active: true }, orderBy: { sortOrder: "asc" },
  });
  const slots = await prisma.slot.findMany({
    where: { active: true, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
  // só horários com vaga
  const free = slots.filter((s) => s.booked < s.capacity).map((s) => ({
    id: s.id, locationId: s.locationId, startsAt: s.startsAt, productId: s.productId,
  }));
  const lastMinuteHours = await getLastMinuteHours();
  return NextResponse.json({ locations, slots: free, lastMinuteHours });
}
