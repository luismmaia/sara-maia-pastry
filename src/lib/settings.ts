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

export type EmailSettings = {
  notifyEmails: string[];
  customerEnabled: boolean;
  ownerEnabled: boolean;
  signature: string;
  replyTo: string;
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const notifyRaw = await getSetting("orderNotifyEmails", "");
  const notifyEmails = notifyRaw.split(/[\s,;]+/).map((s) => s.trim()).filter((e) => e.includes("@"));
  if (notifyEmails.length === 0 && process.env.EMAIL_OWNER) notifyEmails.push(process.env.EMAIL_OWNER);
  return {
    notifyEmails,
    customerEnabled: (await getSetting("emailCustomerEnabled", "1")) !== "0",
    ownerEnabled: (await getSetting("emailOwnerEnabled", "1")) !== "0",
    signature: await getSetting("emailSignature", ""),
    replyTo: await getSetting("emailReplyTo", ""),
  };
}
