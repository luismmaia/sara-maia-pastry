// Emissão automática de fatura no Vendus via API.
// Docs: https://www.vendus.pt/ws/  (verifica os campos exatos do teu plano).
// Se VENDUS_API_KEY estiver vazio, devolve null (faturação manual).
type InvoiceInput = {
  productName: string;
  total: number;            // cêntimos, IVA incluído
  customerName: string;
  customerEmail: string;
  nif?: string | null;
};

export async function createVendusInvoice(input: InvoiceInput): Promise<string | null> {
  const apiKey = process.env.VENDUS_API_KEY;
  if (!apiKey) return null;

  const auth = "Basic " + Buffer.from(apiKey + ":").toString("base64");
  const body: any = {
    type: "FR", // Fatura-Recibo (documento pago). Confirma o tipo que usas no Vendus.
    register_id: process.env.VENDUS_REGISTER_ID || undefined,
    client: {
      name: input.customerName,
      email: input.customerEmail,
      ...(input.nif ? { fiscal_id: input.nif } : {}),
    },
    items: [
      {
        title: input.productName,
        gross_price: input.total / 100, // preço com IVA
        qty: 1,
      },
    ],
  };

  try {
    const res = await fetch("https://www.vendus.pt/ws/v1.1/documents/", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { console.error("Vendus", res.status, await res.text()); return null; }
    const data = await res.json();
    return String(data.id ?? data.number ?? "");
  } catch (e) {
    console.error("Vendus error", e);
    return null;
  }
}
