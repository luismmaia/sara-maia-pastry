"use client";
import { useEffect, useState } from "react";

const eur = (c: number) => "€" + (c / 100).toFixed(2);

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"prod" | "slot" | "locs" | "orders">("prod");

  async function login() {
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pass }) });
    if (r.ok) setAuthed(true); else alert("Palavra-passe incorreta.");
  }
  // tenta carregar; se 401, mostra login
  useEffect(() => { fetch("/api/admin/orders").then((r) => setAuthed(r.ok)); }, []);

  if (!authed) {
    return (
      <div className="admin-wrap" style={{ maxWidth: 360 }}>
        <h2 style={{ fontWeight: 300, letterSpacing: ".1em" }}>Backoffice</h2>
        <div className="field" style={{ marginTop: 20 }}><label>Palavra-passe</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} /></div>
        <button className="btn full" onClick={login}>Entrar</button>
      </div>
    );
  }
  return (
    <div className="admin-wrap">
      <h2 style={{ fontWeight: 300, letterSpacing: ".1em" }}>Sara Maia · Backoffice</h2>
      <div className="admin-tabs">
        <button className={tab === "prod" ? "on" : ""} onClick={() => setTab("prod")}>Produtos</button>
        <button className={tab === "slot" ? "on" : ""} onClick={() => setTab("slot")}>Horários</button>
        <button className={tab === "locs" ? "on" : ""} onClick={() => setTab("locs")}>Locais</button>
        <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>Encomendas</button>
      </div>
      {tab === "prod" && <Products />}
      {tab === "slot" && <Slots />}
      {tab === "locs" && <Locations />}
      {tab === "orders" && <Orders />}
    </div>
  );
}

// ---------- Upload Cloudinary (unsigned) ----------
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const cloudinaryReady = !!(CLOUD && PRESET);
async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", PRESET as string);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message || "Falha no upload");
  return data.secure_url as string;
}

type Choice = { choice: string; delta: string };
type Group = { label: string; choices: Choice[] };
type Editing = {
  id?: string; namePt: string; catPt: string; descPt: string;
  nameEn: string; catEn: string; descEn: string;
  basePrice: string; leadHours: string; trackStock: boolean; stock: string;
  dedicatedSlotsOnly: boolean; groups: Group[]; photos: string[];
};
const emptyEditing = (): Editing => ({
  namePt: "", catPt: "", descPt: "", nameEn: "", catEn: "", descEn: "",
  basePrice: "", leadHours: "24",
  trackStock: false, stock: "", dedicatedSlotsOnly: false, groups: [], photos: [],
});
function toEditing(p: any): Editing {
  // reconstruir grupos a partir das opções (agrupadas por kind)
  const groups: Group[] = [];
  (p.options || []).forEach((o: any) => {
    let g = groups.find((x) => x.label === o.labelPt);
    if (!g) { g = { label: o.labelPt, choices: [] }; groups.push(g); }
    g.choices.push({ choice: o.choicePt, delta: (o.priceDelta / 100).toString() });
  });
  return {
    id: p.id, namePt: p.namePt, catPt: p.catPt, descPt: p.descPt,
    nameEn: p.nameEn || "", catEn: p.catEn || "", descEn: p.descEn || "",
    basePrice: (p.basePrice / 100).toString(), leadHours: String(p.leadHours),
    trackStock: !!p.trackStock, stock: p.stock != null ? String(p.stock) : "",
    dedicatedSlotsOnly: !!p.dedicatedSlotsOnly,
    groups, photos: (p.photos || []).map((ph: any) => ph.url),
  };
}

function Products() {
  const [list, setList] = useState<any[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const load = () => fetch("/api/admin/products").then((r) => r.json()).then(setList);
  useEffect(() => { load(); }, []);

  async function toggleActive(p: any) {
    await fetch(`/api/admin/products/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !p.active }) });
    load();
  }
  async function move(i: number, dir: number) {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    await Promise.all([
      fetch(`/api/admin/products/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: j }) }),
      fetch(`/api/admin/products/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: i }) }),
    ]);
    load();
  }

  if (editing) return <ProductEditor editing={editing} setEditing={setEditing} onSaved={() => { setEditing(null); load(); }} />;

  return (
    <>
      <button className="btn" style={{ marginBottom: 18 }} onClick={() => setEditing(emptyEditing())}>+ Novo produto</button>
      {list.map((p, i) => (
        <div className="a-row" key={p.id} style={p.active ? undefined : { opacity: .5 }}>
          <div className="thumb">{p.photos?.[0] && <img src={p.photos[0].url} alt="" />}</div>
          <div className="meta">
            <b>{p.namePt} {!p.active && <span style={{ color: "var(--accent)" }}>· desativado</span>}</b>
            <small>{eur(p.basePrice)} · {p.leadHours}h antecedência · {p.trackStock ? `stock: ${p.stock ?? 0}` : "por encomenda"} · {p.options?.length || 0} opções · {p.photos?.length || 0} fotos{p.dedicatedSlotsOnly ? " · só horários próprios" : ""}</small>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="a-del" title="Subir" onClick={() => move(i, -1)}>↑</button>
            <button className="a-del" title="Descer" onClick={() => move(i, 1)}>↓</button>
            <button className="btn ghost" style={{ padding: "8px 12px" }} onClick={() => setEditing(toEditing(p))}>Editar</button>
            <button className="btn ghost" style={{ padding: "8px 12px" }} onClick={() => toggleActive(p)}>{p.active ? "Desativar" : "Ativar"}</button>
          </div>
        </div>
      ))}
    </>
  );
}

function ProductEditor({ editing, setEditing, onSaved }: { editing: Editing; setEditing: (e: Editing | null) => void; onSaved: () => void }) {
  const e = editing;
  const up = (patch: Partial<Editing>) => setEditing({ ...e, ...patch });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [translating, setTranslating] = useState(false);

  async function translateFromPt() {
    if (!e.namePt && !e.descPt && !e.catPt) { alert("Preenche primeiro os campos em português."); return; }
    setTranslating(true);
    try {
      const res = await fetch("/api/admin/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ namePt: e.namePt, descPt: e.descPt, catPt: e.catPt }) });
      const d = await res.json();
      if (res.ok) up({ nameEn: d.nameEn || "", catEn: d.catEn || "", descEn: d.descEn || "" });
      else alert("Não foi possível traduzir agora.");
    } catch { alert("Erro de ligação à tradução."); }
    setTranslating(false);
  }

  // grupos / opções
  function addGroup() { if (e.groups.length < 2) up({ groups: [...e.groups, { label: "", choices: [{ choice: "", delta: "0" }] }] }); }
  function removeGroup(gi: number) { up({ groups: e.groups.filter((_, i) => i !== gi) }); }
  function setGroupLabel(gi: number, label: string) { const g = [...e.groups]; g[gi] = { ...g[gi], label }; up({ groups: g }); }
  function addChoice(gi: number) { const g = [...e.groups]; g[gi] = { ...g[gi], choices: [...g[gi].choices, { choice: "", delta: "0" }] }; up({ groups: g }); }
  function removeChoice(gi: number, ci: number) { const g = [...e.groups]; g[gi] = { ...g[gi], choices: g[gi].choices.filter((_, i) => i !== ci) }; up({ groups: g }); }
  function setChoice(gi: number, ci: number, patch: Partial<Choice>) { const g = [...e.groups]; const ch = [...g[gi].choices]; ch[ci] = { ...ch[ci], ...patch }; g[gi] = { ...g[gi], choices: ch }; up({ groups: g }); }

  // fotos
  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadToCloudinary(f));
      up({ photos: [...e.photos, ...urls] });
    } catch (err: any) { alert("Erro no upload: " + err.message); }
    setUploading(false);
  }
  function removePhoto(i: number) { up({ photos: e.photos.filter((_, idx) => idx !== i) }); }
  function movePhoto(i: number, dir: number) { const j = i + dir; if (j < 0 || j >= e.photos.length) return; const p = [...e.photos]; [p[i], p[j]] = [p[j], p[i]]; up({ photos: p }); }
  function addUrl() { if (urlInput.trim()) { up({ photos: [...e.photos, urlInput.trim()] }); setUrlInput(""); } }

  async function save() {
    if (!e.namePt || !e.basePrice) { alert("Indica pelo menos o nome e o preço base."); return; }
    const options = e.groups.flatMap((g, gi) =>
      g.choices.filter((c) => c.choice.trim()).map((c, ci) => ({
        kind: `g${gi}`, labelPt: g.label || `Opção ${gi + 1}`, choicePt: c.choice,
        priceDelta: parseFloat(c.delta) || 0, sortOrder: ci,
      })));
    const payload = {
      namePt: e.namePt, catPt: e.catPt, descPt: e.descPt,
      nameEn: e.nameEn, catEn: e.catEn, descEn: e.descEn,
      basePrice: parseFloat(e.basePrice), leadHours: parseInt(e.leadHours) || 0,
      trackStock: e.trackStock, stock: e.trackStock ? (parseInt(e.stock) || 0) : null,
      dedicatedSlotsOnly: e.dedicatedSlotsOnly,
      options, photos: e.photos,
    };
    setSaving(true);
    const url = e.id ? `/api/admin/products/${e.id}` : "/api/admin/products";
    const method = e.id ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) onSaved(); else alert("Erro ao guardar.");
  }

  return (
    <div>
      <button className="btn ghost" style={{ marginBottom: 18 }} onClick={() => setEditing(null)}>← Voltar</button>
      <h3 style={{ fontWeight: 400, letterSpacing: ".06em" }}>{e.id ? "Editar produto" : "Novo produto"}</h3>

      <div className="mini" style={{ marginTop: 14 }}>
        <div className="field" style={{ gridColumn: "span 2" }}><label>Nome</label><input value={e.namePt} onChange={(ev) => up({ namePt: ev.target.value })} /></div>
        <div className="field"><label>Preço base (€)</label><input value={e.basePrice} onChange={(ev) => up({ basePrice: ev.target.value })} inputMode="decimal" /></div>
        <div className="field"><label>Categoria</label><input value={e.catPt} onChange={(ev) => up({ catPt: ev.target.value })} placeholder="ex.: chocolate" /></div>
        <div className="field"><label>Antecedência (horas)</label><input value={e.leadHours} onChange={(ev) => up({ leadHours: ev.target.value })} inputMode="numeric" /></div>
        <div className="field" style={{ gridColumn: "span 3" }}><label>Descrição</label><input value={e.descPt} onChange={(ev) => up({ descPt: ev.target.value })} /></div>
        <div className="field"><label>Stock limitado?</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 42 }}>
            <input type="checkbox" checked={e.trackStock} onChange={(ev) => up({ trackStock: ev.target.checked })} style={{ width: "auto" }} />
            <span style={{ fontSize: ".82rem", color: "var(--ink-soft)" }}>{e.trackStock ? "limitado" : "por encomenda"}</span>
          </div>
        </div>
        {e.trackStock && <div className="field"><label>Unidades em stock</label><input value={e.stock} onChange={(ev) => up({ stock: ev.target.value })} inputMode="numeric" /></div>}
      </div>

      <label className="check" style={{ marginTop: 14 }}>
        <input type="checkbox" checked={e.dedicatedSlotsOnly} onChange={(ev) => up({ dedicatedSlotsOnly: ev.target.checked })} />
        <span>Só disponível nos horários dedicados a este bolo (não aparece nos horários gerais). Os horários dedicados criam-se no separador <b>Horários</b>.</span>
      </label>

      {/* Inglês (editável; preenche-se sozinho ao guardar se ficar vazio) */}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div className="lbl-u" style={{ marginBottom: 0 }}>Inglês</div>
          <button className="btn ghost" style={{ padding: "7px 12px" }} disabled={translating} onClick={translateFromPt}>{translating ? "A traduzir…" : "Traduzir do português"}</button>
        </div>
        <p className="note" style={{ marginTop: 0 }}>Podes traduzir automaticamente e depois corrigir à mão. Se deixares vazio, o inglês é preenchido por tradução ao guardar.</p>
        <div className="mini">
          <div className="field" style={{ gridColumn: "span 2" }}><label>Nome (EN)</label><input value={e.nameEn} onChange={(ev) => up({ nameEn: ev.target.value })} /></div>
          <div className="field"><label>Categoria (EN)</label><input value={e.catEn} onChange={(ev) => up({ catEn: ev.target.value })} /></div>
          <div className="field" style={{ gridColumn: "span 3" }}><label>Descrição (EN)</label><input value={e.descEn} onChange={(ev) => up({ descEn: ev.target.value })} /></div>
        </div>
      </div>

      {/* Personalizações */}
      <div style={{ marginTop: 26 }}>
        <div className="lbl-u" style={{ marginBottom: 10 }}>Personalizações (até 2)</div>
        {e.groups.map((g, gi) => (
          <div key={gi} style={{ border: "1px solid var(--line)", padding: 14, marginBottom: 10, background: "#fff" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}><label>Nome da personalização</label>
                <input value={g.label} onChange={(ev) => setGroupLabel(gi, ev.target.value)} placeholder="ex.: Tamanho / Decoração" /></div>
              <button className="a-del" title="Remover personalização" onClick={() => removeGroup(gi)}>✕</button>
            </div>
            {g.choices.map((c, ci) => (
              <div key={ci} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)" }} value={c.choice} onChange={(ev) => setChoice(gi, ci, { choice: ev.target.value })} placeholder="ex.: 24 cm" />
                <input style={{ width: 120, padding: "10px 12px", border: "1px solid var(--line)" }} value={c.delta} onChange={(ev) => setChoice(gi, ci, { delta: ev.target.value })} inputMode="decimal" placeholder="+€ (0)" />
                <button className="a-del" onClick={() => removeChoice(gi, ci)}>✕</button>
              </div>
            ))}
            <button className="btn ghost" style={{ padding: "7px 12px", marginTop: 4 }} onClick={() => addChoice(gi)}>+ opção</button>
          </div>
        ))}
        {e.groups.length < 2 && <button className="btn ghost" onClick={addGroup}>+ Adicionar personalização</button>}
      </div>

      {/* Fotos */}
      <div style={{ marginTop: 26 }}>
        <div className="lbl-u" style={{ marginBottom: 10 }}>Fotos (a primeira é a capa)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {e.photos.map((url, i) => (
            <div key={i} style={{ position: "relative", width: 84, height: 84, border: i === 0 ? "2px solid var(--accent)" : "1px solid var(--line)", overflow: "hidden" }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,.85)" }}>
                <button onClick={() => movePhoto(i, -1)} style={{ fontSize: ".7rem", padding: "2px 5px" }}>←</button>
                <button onClick={() => removePhoto(i)} style={{ fontSize: ".7rem", padding: "2px 5px", color: "var(--accent)" }}>✕</button>
                <button onClick={() => movePhoto(i, 1)} style={{ fontSize: ".7rem", padding: "2px 5px" }}>→</button>
              </div>
            </div>
          ))}
        </div>
        {cloudinaryReady ? (
          <label className="btn ghost" style={{ display: "inline-block", cursor: "pointer" }}>
            {uploading ? "A carregar…" : "+ Carregar fotos"}
            <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(ev) => onFiles(ev.target.files)} />
          </label>
        ) : (
          <p className="note">Para carregar fotos por upload, configura o Cloudinary (ver guia). Por agora podes colar um link de imagem:</p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)" }} value={urlInput} onChange={(ev) => setUrlInput(ev.target.value)} placeholder="https://… (colar link de imagem)" />
          <button className="btn ghost" onClick={addUrl}>+ link</button>
        </div>
      </div>

      <div style={{ marginTop: 26, display: "flex", gap: 10 }}>
        <button className="btn" disabled={saving} onClick={save}>{saving ? "A guardar…" : "Guardar produto"}</button>
        <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
      </div>
    </div>
  );
}

function Slots() {
  const [data, setData] = useState<{ locations: any[]; slots: any[]; products: any[] }>({ locations: [], slots: [], products: [] });
  const [loc, setLoc] = useState<string>("");
  const [date, setDate] = useState(""); const [times, setTimes] = useState(""); const [cap, setCap] = useState("3");
  const [err, setErr] = useState("");
  const [productId, setProductId] = useState<string>(""); // "" = horário geral
  const load = () => fetch("/api/admin/slots").then((r) => r.json()).then((d) => { setData(d); if (!loc && d.locations[0]) setLoc(d.locations[0].id); });
  useEffect(() => { load(); }, []);

  async function add() {
    setErr("");
    if (!loc) { setErr("Escolhe primeiro um local."); return; }
    if (!date) { setErr("Escolhe o dia."); return; }
    const tokens = times.split(/[\s,]+/).filter(Boolean);
    if (!tokens.length) { setErr("Indica pelo menos uma hora (ex.: 16:30)."); return; }
    const re = /^([01]?\d|2[0-3]):[0-5]\d$/; // 00:00 a 23:59
    const invalid = tokens.filter((t) => !re.test(t));
    if (invalid.length) { setErr(`Hora inválida: ${invalid.join(", ")}. Usa o formato HH:MM, ex.: 09:00 ou 16:30.`); return; }
    const list = tokens.map((t) => { const [h, m] = t.split(":"); return new Date(`${date}T${h.padStart(2, "0")}:${m}:00`).toISOString(); });
    const res = await fetch("/api/admin/slots", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: loc, startsAtList: list, capacity: parseInt(cap) || 1, productId: productId || null }) });
    if (!res.ok) { setErr("Não foi possível guardar os horários. Tenta novamente."); return; }
    setTimes(""); load();
  }
  async function del(id: string) { await fetch("/api/admin/slots", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  const byDay: Record<string, any[]> = {};
  data.slots.filter((s) => s.locationId === loc).forEach((s) => { const d = new Date(s.startsAt); const k = d.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" }); (byDay[k] ||= []).push(s); });

  return (
    <>
      <p className="note" style={{ marginBottom: 16 }}>Abre horários por local. Dias com horários ficam a verde no calendário do cliente. A capacidade limita quantos bolos podem ser levantados em cada horário. Podes criar um horário <b>geral</b> (qualquer bolo) ou <b>dedicado a um bolo</b> específico.</p>
      <div className="loc-row">{data.locations.map((L) => <button key={L.id} className={"opt" + (loc === L.id ? " on" : "")} onClick={() => setLoc(L.id)}>{L.name}</button>)}</div>

      {Object.keys(byDay).length === 0 && <p className="note">Sem horários abertos neste local.</p>}
      {Object.entries(byDay).map(([day, arr]) => (
        <div className="slotmgr-day" key={day}>
          <b style={{ fontFamily: "Jost", minWidth: 130 }}>{day}</b>
          {arr.map((s) => { const d = new Date(s.startsAt); const hh = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
            return (
              <span className="chip" key={s.id} style={s.product ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}>
                {hh} · {s.booked}/{s.capacity}{s.product ? ` · só ${s.product.namePt}` : ""}
                <button onClick={() => del(s.id)}>✕</button>
              </span>);
          })}
        </div>
      ))}

      <div className="mini" style={{ marginTop: 18 }}>
        <div className="field"><label>Dia</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>Horas (separadas por espaço)</label><input placeholder="10:30 16:30 18:00" value={times} onChange={(e) => { setTimes(e.target.value); if (err) setErr(""); }} /></div>
        <div className="field"><label>Capacidade (cada horário)</label><input value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" /></div>
      </div>
      <div className="field" style={{ marginTop: 10, maxWidth: 360 }}>
        <label>Disponível para</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: "100%", padding: "12px 13px", border: "1px solid var(--line)", background: "#fff", fontFamily: "Inter", fontSize: ".9rem", color: "var(--ink)" }}>
          <option value="">Todos os bolos (horário geral)</option>
          {data.products.map((p) => <option key={p.id} value={p.id}>Só: {p.namePt}</option>)}
        </select>
      </div>
      {err && <p className="note" style={{ color: "var(--accent)", marginTop: 12, marginBottom: 0 }}>{err}</p>}
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={add}>+ Abrir horário(s)</button>
    </>
  );
}

const ORDER_ST: Record<string, { label: string; color: string }> = {
  paid: { label: "Paga", color: "var(--accent)" },
  picked_up: { label: "Levantada", color: "var(--ok)" },
  cancelled: { label: "Cancelada", color: "var(--ink-soft)" },
  pending: { label: "Por pagar", color: "var(--ink-soft)" },
};
const dtLabel = (d: string | Date) => new Date(d).toLocaleString("pt-PT", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [view, setView] = useState<"agenda" | "list">("agenda");
  const [fLoc, setFLoc] = useState(""); const [fStatus, setFStatus] = useState("");
  const [fFrom, setFFrom] = useState(""); const [fTo, setFTo] = useState(""); const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string>("");
  const load = () => fetch("/api/admin/orders").then((r) => r.json()).then((d) => setOrders(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const locNames = Array.from(new Set(orders.map((o) => o.location?.name).filter(Boolean)));

  const filtered = orders.filter((o) => {
    if (fLoc && o.location?.name !== fLoc) return false;
    if (fStatus && o.status !== fStatus) return false;
    const day = new Date(o.pickupAt); const ymd = day.toISOString().slice(0, 10);
    if (fFrom && ymd < fFrom) return false;
    if (fTo && ymd > fTo) return false;
    if (q) { const s = (o.customerName + " " + o.customerPhone + " " + o.customerEmail + " " + o.productName).toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  });

  const count = filtered.length;
  const revenue = filtered.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  async function act(id: string, path: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(id + path);
    try {
      const res = await fetch(`/api/admin/orders/${id}/${path}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) alert(d.error || "Não foi possível concluir.");
      else if (path === "cancel") alert(d.refunded ? "Cancelada e reembolsada." : "Cancelada (sem reembolso automático).");
      else if (path === "resend") alert("Email reenviado (se os emails estiverem configurados).");
      load();
    } catch { alert("Erro de ligação."); }
    setBusy("");
  }
  async function invoice(id: string) {
    setBusy(id + "invoice");
    try {
      const res = await fetch(`/api/admin/orders/${id}/invoice`);
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) window.open(d.url, "_blank");
      else alert(d.error || (d.id ? "Fatura " + d.id + " — sem link disponível." : "Sem fatura."));
    } catch { alert("Erro de ligação."); }
    setBusy("");
  }

  function exportCsv() {
    const head = ["Levantamento", "Produto", "Opções", "Total (€)", "Estado", "Cliente", "Telemóvel", "Email", "NIF", "Local", "Fatura Vendus"];
    const cell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filtered.map((o) => [
      dtLabel(o.pickupAt), o.productName, [o.sizeLabel, o.decoLabel].filter(Boolean).join(" · "),
      (o.total / 100).toFixed(2), ORDER_ST[o.status]?.label || o.status,
      o.customerName, o.customerPhone, o.customerEmail, o.nif || "", o.location?.name || "", o.vendusInvoiceId || "",
    ].map(cell).join(";"));
    const csv = "\ufeff" + [head.map(cell).join(";"), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "encomendas.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const orderCard = (o: any) => {
    const st = ORDER_ST[o.status] || ORDER_ST.pending; const b = (p: string) => busy === o.id + p;
    return (
      <div className="a-row" key={o.id} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <b>{o.productName} — {eur(o.total)} <span style={{ color: st.color }}>· {st.label}</span></b>
          <span style={{ color: "var(--ink-soft)", fontSize: ".82rem" }}>{dtLabel(o.pickupAt)} · {o.location?.name}</span>
        </div>
        <small style={{ color: "var(--ink-soft)" }}>
          {[o.sizeLabel, o.decoLabel].filter(Boolean).join(" · ")}
          {(o.sizeLabel || o.decoLabel) ? " — " : ""}{o.customerName} · {o.customerPhone} · {o.customerEmail}{o.nif ? " · NIF " + o.nif : ""}
        </small>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {o.status === "paid" && <button className="btn ghost" style={{ padding: "7px 12px" }} disabled={b("pickup")} onClick={() => act(o.id, "pickup")}>Marcar levantada</button>}
          {(o.status === "paid" || o.status === "picked_up") && <button className="btn ghost" style={{ padding: "7px 12px" }} disabled={b("cancel")} onClick={() => act(o.id, "cancel", "Cancelar e reembolsar esta encomenda?")}>Cancelar / reembolsar</button>}
          <button className="btn ghost" style={{ padding: "7px 12px" }} disabled={b("resend")} onClick={() => act(o.id, "resend")}>Reenviar email</button>
          {o.vendusInvoiceId && <button className="btn ghost" style={{ padding: "7px 12px" }} disabled={b("invoice")} onClick={() => invoice(o.id)}>Ver fatura</button>}
        </div>
      </div>
    );
  };

  // Agenda: agrupar por dia de levantamento
  const byDay: Record<string, any[]> = {};
  filtered.forEach((o) => { const k = new Date(o.pickupAt).toISOString().slice(0, 10); (byDay[k] ||= []).push(o); });
  const days = Object.keys(byDay).sort();

  return (
    <>
      <div className="admin-tabs" style={{ marginTop: 0 }}>
        <button className={view === "agenda" ? "on" : ""} onClick={() => setView("agenda")}>Agenda</button>
        <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>Lista</button>
        <button onClick={exportCsv} style={{ marginLeft: "auto", border: "1px solid var(--line)", padding: "10px 16px", fontFamily: "Jost", fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase" }}>Exportar CSV</button>
      </div>

      <div className="mini" style={{ marginBottom: 10 }}>
        <div className="field"><label>Local</label>
          <select value={fLoc} onChange={(e) => setFLoc(e.target.value)} style={{ width: "100%", padding: "12px 13px", border: "1px solid var(--line)", background: "#fff" }}>
            <option value="">Todos</option>{locNames.map((n) => <option key={n as string} value={n as string}>{n as string}</option>)}
          </select></div>
        <div className="field"><label>Estado</label>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ width: "100%", padding: "12px 13px", border: "1px solid var(--line)", background: "#fff" }}>
            <option value="">Todos</option><option value="paid">Paga</option><option value="picked_up">Levantada</option><option value="cancelled">Cancelada</option>
          </select></div>
        <div className="field"><label>Pesquisar</label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="nome, email, telemóvel…" /></div>
        <div className="field"><label>De</label><input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></div>
        <div className="field"><label>Até</label><input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} /></div>
      </div>
      <p className="note" style={{ marginBottom: 16 }}><b>{count}</b> encomenda(s) · total <b>{eur(revenue)}</b> (exclui canceladas)</p>

      {filtered.length === 0 && <p className="note">Nenhuma encomenda com estes filtros.</p>}

      {view === "list" && [...filtered].sort((a, b) => new Date(b.pickupAt).getTime() - new Date(a.pickupAt).getTime()).map(orderCard)}

      {view === "agenda" && days.map((k) => {
        const arr = byDay[k].sort((a, b) => new Date(a.pickupAt).getTime() - new Date(b.pickupAt).getTime());
        const dayRev = arr.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
        const label = new Date(k + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" });
        return (
          <div key={k} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line-strong)", paddingBottom: 6, marginBottom: 10 }}>
              <b style={{ fontFamily: "Jost", letterSpacing: ".1em", textTransform: "capitalize" }}>{label}</b>
              <span className="note" style={{ margin: 0 }}>{arr.length} · {eur(dayRev)}</span>
            </div>
            {arr.map(orderCard)}
          </div>
        );
      })}
    </>
  );
}

function Locations() {
  const [list, setList] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, { name: string; instructions: string }>>({});
  const [nName, setNName] = useState(""); const [nInstr, setNInstr] = useState("");
  const load = () => fetch("/api/admin/locations").then((r) => r.json()).then((d) => {
    setList(d);
    const m: Record<string, { name: string; instructions: string }> = {};
    d.forEach((l: any) => { m[l.id] = { name: l.name, instructions: l.instructions || "" }; });
    setEdits(m);
  });
  useEffect(() => { load(); }, []);

  async function add() {
    if (!nName.trim()) return;
    await fetch("/api/admin/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nName, instructions: nInstr }) });
    setNName(""); setNInstr(""); load();
  }
  async function save(id: string) {
    const e = edits[id]; if (!e) return;
    await fetch(`/api/admin/locations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: e.name, instructions: e.instructions }) });
    load();
  }
  async function toggle(l: any) {
    await fetch(`/api/admin/locations/${l.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !l.active }) });
    load();
  }
  async function move(i: number, dir: number) {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    await Promise.all([
      fetch(`/api/admin/locations/${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: j }) }),
      fetch(`/api/admin/locations/${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: i }) }),
    ]);
    load();
  }
  const setE = (id: string, patch: Partial<{ name: string; instructions: string }>) => setEdits((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  return (
    <>
      <p className="note" style={{ marginBottom: 16 }}>Pontos de levantamento. As instruções aparecem ao cliente quando escolhe o local e na confirmação por email. "Desativar" esconde o local do site mas mantém horários e histórico.</p>

      {list.map((l, i) => (
        <div key={l.id} style={{ border: "1px solid var(--line)", padding: 14, marginBottom: 10, background: "#fff", opacity: l.active ? 1 : .55 }}>
          <div className="field"><label>Nome do local {!l.active && <span style={{ color: "var(--accent)" }}>· desativado</span>}</label>
            <input value={edits[l.id]?.name ?? ""} onChange={(e) => setE(l.id, { name: e.target.value })} /></div>
          <div className="field" style={{ marginBottom: 10 }}><label>Instruções de levantamento</label>
            <textarea value={edits[l.id]?.instructions ?? ""} onChange={(e) => setE(l.id, { instructions: e.target.value })} rows={3}
              style={{ width: "100%", padding: "12px 13px", border: "1px solid var(--line)", background: "#fff", fontFamily: "Inter", fontSize: ".9rem", color: "var(--ink)", resize: "vertical" }}
              placeholder="ex.: Rua das Flores, 12, Maia. Toca à campainha 2B. Estacionamento à porta." /></div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" style={{ padding: "10px 16px" }} onClick={() => save(l.id)}>Guardar</button>
            <button className="btn ghost" style={{ padding: "10px 16px" }} onClick={() => toggle(l)}>{l.active ? "Desativar" : "Ativar"}</button>
            <button className="a-del" title="Subir" onClick={() => move(i, -1)}>↑</button>
            <button className="a-del" title="Descer" onClick={() => move(i, 1)}>↓</button>
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px solid var(--line)", marginTop: 20, paddingTop: 20 }}>
        <div className="lbl-u" style={{ marginBottom: 10 }}>Novo ponto de levantamento</div>
        <div className="field"><label>Nome do local</label><input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="ex.: Atelier · Maia" /></div>
        <div className="field" style={{ marginBottom: 10 }}><label>Instruções de levantamento</label>
          <textarea value={nInstr} onChange={(e) => setNInstr(e.target.value)} rows={3}
            style={{ width: "100%", padding: "12px 13px", border: "1px solid var(--line)", background: "#fff", fontFamily: "Inter", fontSize: ".9rem", color: "var(--ink)", resize: "vertical" }}
            placeholder="Morada, indicações, contacto, estacionamento…" /></div>
        <button className="btn ghost" onClick={add}>+ Adicionar local</button>
      </div>
    </>
  );
}
