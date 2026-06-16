"use client";
import { useEffect, useState } from "react";

type User = { id: string; email: string; name: string | null; phone: string | null; nif: string | null };

const ST: Record<string, { label: string; color: string }> = {
  paid: { label: "Paga", color: "var(--accent)" },
  unpaid: { label: "Não paga", color: "#B07A1E" },
  picked_up: { label: "Levantada", color: "var(--ok)" },
  cancelled: { label: "Cancelada", color: "var(--ink-soft)" },
};
const eur = (c: number) => "€" + (c / 100).toFixed(2);
const dt = (d: string) => new Date(d).toLocaleString("pt-PT", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ContaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [f, setF] = useState({ email: "", password: "", name: "", phone: "", nif: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [profileMsg, setProfileMsg] = useState("");

  async function loadMe() {
    setLoading(true);
    const d = await fetch("/api/auth/me").then((r) => r.json()).catch(() => ({ user: null }));
    setUser(d.user);
    if (d.user) { setF((x) => ({ ...x, name: d.user.name || "", phone: d.user.phone || "", nif: d.user.nif || "" })); loadOrders(); }
    setLoading(false);
  }
  async function loadOrders() {
    const d = await fetch("/api/auth/orders").then((r) => r.json()).catch(() => []);
    setOrders(Array.isArray(d) ? d : []);
  }
  useEffect(() => { loadMe(); }, []);

  async function submit() {
    setErr(""); setBusy(true);
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email: f.email, password: f.password } : f;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(d.error || "Não foi possível concluir."); return; }
    setUser(d.user); setF((x) => ({ ...x, password: "", name: d.user.name || "", phone: d.user.phone || "", nif: d.user.nif || "" })); loadOrders();
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setOrders([]); }
  async function saveProfile() {
    setProfileMsg("");
    const res = await fetch("/api/auth/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name, phone: f.phone, nif: f.nif }) });
    if (res.ok) { setProfileMsg("Dados guardados."); loadMe(); }
  }
  async function cancelOrder(id: string) {
    if (!confirm("Cancelar esta encomenda? O valor será reembolsado.")) return;
    const res = await fetch(`/api/auth/orders/${id}/cancel`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) alert(d.error || "Não foi possível cancelar.");
    loadOrders();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/" style={{ textDecoration: "none", color: "var(--ink)" }} className="brandword">Sara Maia Pastry</a>
          <a href="/" className="nav-links" style={{ color: "var(--ink)", textDecoration: "none", fontFamily: "Jost", letterSpacing: ".2em", fontSize: ".72rem", textTransform: "uppercase" }}>← Loja</a>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <span className="eyebrow">a minha conta</span>

        {loading ? <p className="note" style={{ marginTop: 20 }}>A carregar…</p> : !user ? (
          <div style={{ maxWidth: 420, marginTop: 24 }}>
            <div className="menu-toggle" style={{ marginBottom: 20 }}>
              <button className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }}>Entrar</button>
              <button className={mode === "register" ? "on" : ""} onClick={() => { setMode("register"); setErr(""); }}>Criar conta</button>
            </div>
            {mode === "register" && (<>
              <div className="field"><label>Nome</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div className="field"><label>Telemóvel</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div className="field"><label>NIF (opcional)</label><input value={f.nif} onChange={(e) => setF({ ...f, nif: e.target.value })} /></div>
            </>)}
            <div className="field"><label>Email</label><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="field"><label>Palavra-passe</label><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && submit()} /></div>
            {err && <p className="note" style={{ color: "var(--accent)" }}>{err}</p>}
            <button className="btn full" disabled={busy} onClick={submit}>{busy ? "Um momento…" : (mode === "login" ? "Entrar" : "Criar conta")}</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8, marginBottom: 28 }}>
              <p style={{ margin: 0, color: "var(--ink-soft)" }}>Sessão iniciada como <b style={{ color: "var(--ink)" }}>{user.email}</b></p>
              <button className="nav-links" style={{ color: "var(--accent)", fontFamily: "Jost", letterSpacing: ".18em", fontSize: ".7rem", textTransform: "uppercase" }} onClick={logout}>Sair</button>
            </div>

            <h3 style={{ fontWeight: 300, letterSpacing: ".12em", fontSize: "1rem", borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>Os meus dados</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div className="field"><label>Nome</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div className="field"><label>Telemóvel</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div className="field"><label>NIF</label><input value={f.nif} onChange={(e) => setF({ ...f, nif: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn ghost" onClick={saveProfile}>Guardar dados</button>
              {profileMsg && <span style={{ color: "var(--ok)", fontSize: ".85rem" }}>{profileMsg}</span>}
            </div>

            <h3 style={{ fontWeight: 300, letterSpacing: ".12em", fontSize: "1rem", borderBottom: "1px solid var(--line)", paddingBottom: 8, marginTop: 40 }}>Histórico de encomendas</h3>
            {orders.length === 0 && <p className="note">Ainda não tens encomendas.</p>}
            {orders.map((o) => {
              const st = ST[o.status] || { label: o.status, color: "var(--ink-soft)" };
              const canCancel = o.status === "paid" && new Date(o.pickupAt) > new Date();
              return (
                <div key={o.id} style={{ border: "1px solid var(--line)", padding: 16, marginTop: 12, background: "var(--bg-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <b>{o.productName} — {eur(o.total)} <span style={{ color: st.color }}>· {st.label}</span></b>
                    <span style={{ color: "var(--ink-soft)", fontSize: ".84rem" }}>{dt(o.pickupAt)}</span>
                  </div>
                  <p style={{ margin: "6px 0 0", color: "var(--ink-soft)", fontSize: ".86rem" }}>
                    {[o.sizeLabel, o.decoLabel].filter(Boolean).join(" · ")}{(o.sizeLabel || o.decoLabel) ? " — " : ""}Levantamento: {o.location?.name}
                  </p>
                  {canCancel && <button className="btn ghost" style={{ marginTop: 12, padding: "8px 14px", borderColor: "var(--accent)", color: "var(--accent)" }} onClick={() => cancelOrder(o.id)}>Cancelar encomenda</button>}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
