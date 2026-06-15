import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    id: s.id, locationId: s.locationId, startsAt: s.startsAt,
  }));
  return NextResponse.json({ locations, slots: free });
}
