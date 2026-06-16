import { prisma } from "@/lib/prisma";

export async function getSetting(key: string, fallback: string): Promise<string> {
  try {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value ?? fallback;
  } catch { return fallback; }
}

export async function getLastMinuteHours(): Promise<number> {
  const v = parseInt(await getSetting("lastMinuteHours", "24"), 10);
  return Number.isFinite(v) && v > 0 ? v : 24;
}
