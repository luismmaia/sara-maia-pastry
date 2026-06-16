// Tradução PT -> EN via MyMemory (grátis, sem chave).
// Limite anónimo ~5.000 caracteres/dia por IP; com MYMEMORY_EMAIL sobe para ~50.000/dia.
// Se falhar (rede/limite), devolve o texto original para não bloquear nada.
export async function translatePtToEn(text: string): Promise<string> {
  const t = (text || "").trim();
  if (!t) return "";
  try {
    const email = process.env.MYMEMORY_EMAIL ? `&de=${encodeURIComponent(process.env.MYMEMORY_EMAIL)}` : "";
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=pt|en${email}`;
    const res = await fetch(url, { headers: { "User-Agent": "sara-maia-pastry" } });
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (res.ok && data?.responseStatus === 200 && typeof out === "string" && out.trim()) {
      // o MyMemory às vezes devolve avisos em maiúsculas quando algo corre mal
      if (/MYMEMORY WARNING|INVALID|PLEASE SELECT/i.test(out)) return t;
      return out;
    }
  } catch { /* ignora e usa o original */ }
  return t;
}

export async function translateMany(texts: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const x of texts) out.push(await translatePtToEn(x)); // sequencial para não exceder limites
  return out;
}
