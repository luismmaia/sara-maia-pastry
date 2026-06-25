// Envio de emails transacionais via Resend (https://resend.com).
// Se RESEND_API_KEY estiver vazio, as funções não fazem nada (modo silencioso).
import { getEmailSettings } from "@/lib/settings";

type Order = {
  productName: string; sizeLabel?: string | null; decoLabel?: string | null;
  total: number; pickupAt: Date; locationName: string; locationInstructions?: string;
  customerName: string; customerEmail: string;
};

export async function send(to: string | string[], subject: string, html: string, replyTo?: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY não configurada." };
  if (!process.env.EMAIL_FROM) return { ok: false, error: "EMAIL_FROM não configurado." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) { const t = await res.text(); console.error("email error", res.status, t); return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` }; }
    return { ok: true };
  } catch (e: any) {
    console.error("email error", e);
    return { ok: false, error: e?.message || "erro de ligação" };
  }
}

const fmt = (c: number) => (c / 100).toFixed(2) + " €";
const when = (d: Date) => d.toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });

export async function sendOrderEmails(o: Order) {
  const cfg = await getEmailSettings();

  const sig = cfg.signature
    ? `<p style="color:#6E6E6A;white-space:pre-wrap;margin-top:22px;border-top:1px solid #E7E3DD;padding-top:14px">${cfg.signature}</p>`
    : "";

  const body = `
    <div style="font-family:Arial,sans-serif;color:#3A3A38">
      <h2 style="font-weight:300;letter-spacing:.1em">Sara Maia · Pastry</h2>
      <p>Olá ${o.customerName}, a tua encomenda está confirmada.</p>
      <p><b>${o.productName}</b><br>${o.sizeLabel ?? ""} ${o.decoLabel ? "· " + o.decoLabel : ""}</p>
      <p>Levantamento: <b>${o.locationName}</b><br>${when(o.pickupAt)}</p>
      ${o.locationInstructions ? `<p style="color:#6E6E6A;white-space:pre-wrap;border-left:2px solid #8C5E68;padding-left:10px">${o.locationInstructions}</p>` : ""}
      <p>Total: <b>${fmt(o.total)}</b></p>
      ${sig}
    </div>`;

  // Confirmação ao cliente
  if (cfg.customerEnabled && o.customerEmail) {
    await send(o.customerEmail, "Encomenda confirmada · Sara Maia Pastry", body, cfg.replyTo || undefined);
  }
  // Aviso de nova encomenda à lista de destinatários
  if (cfg.ownerEnabled && cfg.notifyEmails.length) {
    await send(cfg.notifyEmails, `Nova encomenda: ${o.productName}`,
      `<p><b>${o.customerName}</b> (${o.customerEmail})</p>${body}`, o.customerEmail);
  }
}
