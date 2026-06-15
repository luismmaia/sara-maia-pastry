// Envio de emails transacionais via Resend (https://resend.com).
// Se RESEND_API_KEY estiver vazio, as funções não fazem nada (modo silencioso).
type Order = {
  productName: string; sizeLabel?: string | null; decoLabel?: string | null;
  total: number; pickupAt: Date; locationName: string;
  customerName: string; customerEmail: string;
};

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
    });
  } catch (e) {
    console.error("email error", e);
  }
}

const fmt = (c: number) => (c / 100).toFixed(2) + " €";
const when = (d: Date) => d.toLocaleString("pt-PT", { dateStyle: "long", timeStyle: "short" });

export async function sendOrderEmails(o: Order) {
  const body = `
    <div style="font-family:Arial,sans-serif;color:#3A3A38">
      <h2 style="font-weight:300;letter-spacing:.1em">Sara Maia · Pastry</h2>
      <p>Olá ${o.customerName}, a tua encomenda está confirmada.</p>
      <p><b>${o.productName}</b><br>${o.sizeLabel ?? ""} ${o.decoLabel ? "· " + o.decoLabel : ""}</p>
      <p>Levantamento: <b>${o.locationName}</b><br>${when(o.pickupAt)}</p>
      <p>Total pago: <b>${fmt(o.total)}</b></p>
    </div>`;
  await send(o.customerEmail, "Encomenda confirmada · Sara Maia Pastry", body);
  if (process.env.EMAIL_OWNER) {
    await send(process.env.EMAIL_OWNER,
      `Nova encomenda: ${o.productName}`,
      `<p>${o.customerName} (${o.customerEmail})</p>${body}`);
  }
}
