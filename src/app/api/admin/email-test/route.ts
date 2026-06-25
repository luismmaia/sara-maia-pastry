import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { send } from "@/lib/email";
import { getEmailSettings } from "@/lib/settings";
async function ok() { return verifyAdminToken(cookies().get("sm_admin")?.value); }

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const cfg = await getEmailSettings();
  const to = (b.to && String(b.to).trim()) || cfg.notifyEmails[0];
  if (!to) return NextResponse.json({ error: "Indica um email de destino ou preenche a lista de destinatários." }, { status: 400 });
  const r = await send(to, "Teste · Sara Maia Pastry",
    `<div style="font-family:Arial,sans-serif;color:#3A3A38"><h2 style="font-weight:300">Email de teste</h2><p>Se estás a ler isto, o envio de emails está a funcionar. ✅</p></div>`,
    cfg.replyTo || undefined);
  if (!r.ok) return NextResponse.json({ error: r.error || "Falhou." }, { status: 502 });
  return NextResponse.json({ ok: true, to });
}
