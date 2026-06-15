"use client";
import { useEffect, useState } from "react";

const eur = (c: number) => "€" + (c / 100).toFixed(2);

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"prod" | "slot" | "orders">("prod");

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
        <button className={tab === "orders" ? "on" : ""} onClick={() => setTab("orders")}>Encomendas</button>
      </div>
      {tab === "prod" && <Products />}
      {tab === "slot" && <Slots />}
      {tab === "orders" && <Orders />}
    </div>
  );
}

function Products() {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState({ namePt: "", nameEn: "", basePrice: "", catPt: "", photo: "", leadDays: "2", trackStock: false, stock: "" });
  const load = () => fetch("/api/admin/products").then((r) => r.json()).then(setList);
  useEffect(() => { load(); }, []);
  async function add() {
    if (!f.namePt || !f.basePrice) return;
    await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        namePt: f.namePt, nameEn: f.nameEn || f.namePt, catPt: f.catPt, basePrice: parseFloat(f.basePrice),
        leadDays: parseInt(f.leadDays) || 0, trackStock: f.trackStock, stock: f.trackStock ? (parseInt(f.stock) || 0) : null,
        photos: f.photo ? [f.photo] : [],
        options: [
          { kind: "size", labelPt: "Tamanho", labelEn: "Size", choicePt: "20 cm", choiceEn: "20 cm", priceDelta: 0 },
          { kind: "size", labelPt: "Tamanho", labelEn: "Size", choicePt: "24 cm", choiceEn: "24 cm", priceDelta: 8 },
        ],
      }) });
    setF({ namePt: "", nameEn: "", basePrice: "", catPt: "", photo: "", leadDays: "2", trackStock: false, stock: "" }); load();
  }
  async function del(id: string) { await fetch(`/api/admin/products/${id}`, { method: "DELETE" }); load(); }
  return (
    <>
      <p className="note" style={{ marginBottom: 16 }}>Cada produto leva até 2 personalizações (ex.: Tamanho, Decoração) com impacto no preço, e fotos. Aqui em baixo é um formulário rápido; podemos expandir para editar opções e várias fotos.</p>
      {list.map((p) => (
        <div className="a-row" key={p.id}>
          <div className="thumb">{p.photos?.[0] && <img src={p.photos[0].url} />}</div>
          <div className="meta"><b>{p.namePt}</b><small>{eur(p.basePrice)} · {p.leadDays}d antecedência · {p.trackStock ? `stock: ${p.stock ?? 0}` : "por encomenda"}</small></div>
          <button className="a-del" onClick={() => del(p.id)}>✕</button>
        </div>
      ))}
      <div className="mini" style={{ marginTop: 14 }}>
        <div className="field"><label>Nome (PT)</label><input value={f.namePt} onChange={(e) => setF({ ...f, namePt: e.target.value })} /></div>
        <div className="field"><label>Nome (EN)</label><input value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} /></div>
        <div className="field"><label>Preço base (€)</label><input value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: e.target.value })} /></div>
        <div className="field"><label>Categoria</label><input value={f.catPt} onChange={(e) => setF({ ...f, catPt: e.target.value })} /></div>
        <div className="field" style={{ gridColumn: "span 2" }}><label>URL da foto</label><input value={f.photo} onChange={(e) => setF({ ...f, photo: e.target.value })} placeholder="https://..." /></div>
        <div className="field"><label>Antecedência (dias)</label><input value={f.leadDays} onChange={(e) => setF({ ...f, leadDays: e.target.value })} inputMode="numeric" /></div>
        <div className="field"><label>Stock limitado?</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: 42 }}>
            <input type="checkbox" checked={f.trackStock} onChange={(e) => setF({ ...f, trackStock: e.target.checked })} style={{ width: "auto" }} />
            <span style={{ fontSize: ".82rem", color: "var(--ink-soft)" }}>{f.trackStock ? "limitado" : "por encomenda"}</span>
          </div>
        </div>
        {f.trackStock && <div className="field"><label>Unidades em stock</label><input value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} inputMode="numeric" /></div>}
      </div>
      <button className="btn ghost" onClick={add}>+ Adicionar produto</button>
    </>
  );
}

function Slots() {
  const [data, setData] = useState<{ locations: any[]; slots: any[] }>({ locations: [], slots: [] });
  const [loc, setLoc] = useState<string>("");
  const [date, setDate] = useState(""); const [time, setTime] = useState(""); const [cap, setCap] = useState("3");
  const load = () => fetch("/api/admin/slots").then((r) => r.json()).then((d) => { setData(d); if (!loc && d.locations[0]) setLoc(d.locations[0].id); });
  useEffect(() => { load(); }, []);
  async function add() {
    if (!loc || !date || !time) return;
    const startsAt = new Date(`${date}T${time}:00`).toISOString();
    await fetch("/api/admin/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: loc, startsAt, capacity: parseInt(cap) || 1 }) });
    setTime(""); load();
  }
  async function del(id: string) { await fetch("/api/admin/slots", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }
  const byDay: Record<string, any[]> = {};
  data.slots.filter((s) => s.locationId === loc).forEach((s) => { const d = new Date(s.startsAt); const k = d.toLocaleDateString("pt-PT"); (byDay[k] ||= []).push(s); });
  return (
    <>
      <p className="note" style={{ marginBottom: 16 }}>Abre horários por local. Dias com horários ficam a verde no calendário do cliente. A capacidade limita quantos bolos podem ser levantados nesse horário.</p>
      <div className="loc-row">{data.locations.map((L) => <button key={L.id} className={"opt" + (loc === L.id ? " on" : "")} onClick={() => setLoc(L.id)}>{L.name}</button>)}</div>
      {Object.keys(byDay).length === 0 && <p className="note">Sem horários abertos neste local.</p>}
      {Object.entries(byDay).map(([day, arr]) => (
        <div className="slotmgr-day" key={day}>
          <b style={{ fontFamily: "Jost", minWidth: 120 }}>{day}</b>
          {arr.map((s) => { const d = new Date(s.startsAt); const hh = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
            return <span className="chip" key={s.id}>{hh} · {s.booked}/{s.capacity}<button onClick={() => del(s.id)}>✕</button></span>; })}
        </div>
      ))}
      <div className="mini" style={{ marginTop: 14 }}>
        <div className="field"><label>Dia</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>Hora</label><input placeholder="16:30" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div className="field"><label>Capacidade</label><input value={cap} onChange={(e) => setCap(e.target.value)} /></div>
      </div>
      <button className="btn ghost" onClick={add}>+ Abrir horário</button>
    </>
  );
}

function Orders() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { fetch("/api/admin/orders").then((r) => r.json()).then(setList); }, []);
  return (
    <>
      {list.length === 0 && <p className="note">Ainda sem encomendas.</p>}
      {list.map((o) => (
        <div className="a-row" key={o.id}>
          <div className="meta">
            <b>{o.productName} — {eur(o.total)} <span style={{ color: o.status === "paid" ? "var(--ok)" : "var(--accent)" }}>· {o.status}</span></b>
            <small>{o.customerName} · {o.customerPhone} · {o.customerEmail}{o.nif ? " · NIF " + o.nif : ""}</small>
            <small>{o.location?.name} · {new Date(o.pickupAt).toLocaleString("pt-PT")}{o.sizeLabel ? " · " + o.sizeLabel : ""}{o.decoLabel ? " · " + o.decoLabel : ""}</small>
          </div>
        </div>
      ))}
    </>
  );
}
