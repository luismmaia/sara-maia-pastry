"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { T, MONTHS, DOWS, Lang } from "./dict";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");
const eur = (cents: number) => "€" + (cents / 100).toFixed(0);
const soldOut = (p: { trackStock: boolean; stock: number | null }) => p.trackStock && (p.stock ?? 0) <= 0;
const lowStock = (p: { trackStock: boolean; stock: number | null }) => p.trackStock && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 3;

type Opt = { id: string; kind: string; labelPt: string; labelEn: string; choicePt: string; choiceEn: string; priceDelta: number };
type Photo = { id: string; url: string };
type Product = { id: string; namePt: string; nameEn: string; descPt: string; descEn: string; catPt: string; catEn: string; basePrice: number; leadHours: number; trackStock: boolean; stock: number | null; dedicatedSlotsOnly: boolean; photos: Photo[]; options: Opt[] };
type Location = { id: string; name: string; slug: string; instructions: string };
type Slot = { id: string; locationId: string; startsAt: string; productId: string | null };

export default function Storefront() {
  const [lang, setLang] = useState<Lang>("pt");
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const t = (k: string) => T[lang][k] ?? k;
  // Texto de produto: em EN, se o campo estiver vazio, mostra o PT (a loja gere textos em PT).
  const tx = (pt: string, en: string) => (lang === "pt" ? pt : (en && en.trim() ? en : pt));

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" }).then((r) => r.json()).then(setProducts).catch(() => {});
    fetch("/api/availability", { cache: "no-store" }).then((r) => r.json()).then((d) => { setLocations(d.locations || []); setSlots(d.slots || []); }).catch(() => {});
  }, []);

  // ----- product modal state -----
  const [cur, setCur] = useState<Product | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [sel, setSel] = useState<Record<string, string>>({}); // kind do grupo -> id da opção
  const [locId, setLocId] = useState<string | null>(null);
  const [cal, setCal] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);

  // ----- order + checkout -----
  const [order, setOrder] = useState<any>(null);
  const [coOpen, setCoOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Agrupa as opções por "kind", preservando a ordem de aparição. Cada grupo = 1 personalização.
  const groups = useMemo(() => {
    const out: { kind: string; label: string; choices: Opt[] }[] = [];
    (cur?.options ?? []).forEach((o) => {
      let g = out.find((x) => x.kind === o.kind);
      if (!g) { g = { kind: o.kind, label: tx(o.labelPt, o.labelEn), choices: [] }; out.push(g); }
      g.choices.push(o);
    });
    return out;
  }, [cur, lang]);

  // navegação entre fotos (swipe no telemóvel / arrastar com o rato)
  const dragX = useRef<number | null>(null);
  function nextPhoto(dir: number) {
    if (!cur || cur.photos.length < 2) return;
    const n = cur.photos.length;
    setPhotoIdx((i) => (dir > 0 ? (i + 1) % n : (i - 1 + n) % n));
  }
  function onSwipeStart(x: number) { dragX.current = x; }
  function onSwipeEnd(x: number) {
    if (dragX.current == null) return;
    const dx = x - dragX.current; dragX.current = null;
    if (Math.abs(dx) > 40) nextPhoto(dx < 0 ? 1 : -1);
  }

  function openProduct(p: Product) {
    setCur(p); setPhotoIdx(0); setSel({});
    setLocId(locations[0]?.id ?? null); setDayKey(null); setSlotId(null);
    const d = new Date(); setCal({ y: d.getFullYear(), m: d.getMonth() });
    document.body.style.overflow = "hidden";
  }
  function closeAll() { setCur(null); setCoOpen(false); document.body.style.overflow = ""; }

  const price = useMemo(() => {
    if (!cur) return 0;
    let p = cur.basePrice;
    for (const g of groups) {
      const chosen = g.choices.find((o) => o.id === sel[g.kind]);
      if (chosen) p += chosen.priceDelta;
    }
    return p;
  }, [cur, groups, sel]);

  const allGroupsChosen = groups.every((g) => !!sel[g.kind]);
  const ready = allGroupsChosen && !!slotId && !(cur && soldOut(cur));

  // calendar helpers
  const key = (y: number, m: number, d: number) => `${y}-${m}-${d}`;
  const daySlots = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    const minMs = Date.now() + (cur?.leadHours ?? 0) * 3600 * 1000;
    const usable = (s: Slot) =>
      s.locationId === locId &&
      new Date(s.startsAt).getTime() >= minMs &&
      (!s.productId || s.productId === cur?.id) &&
      (!cur?.dedicatedSlotsOnly || s.productId === cur?.id);
    slots.filter(usable).forEach((s) => {
      const d = new Date(s.startsAt); const k = key(d.getFullYear(), d.getMonth(), d.getDate());
      (map[k] ||= []).push(s);
    });
    return map;
  }, [slots, locId, cur]);

  function addToOrder() {
    if (!ready || !cur) { setToastMsg(t("t_need")); return; }
    const s = slots.find((x) => x.id === slotId)!; const loc = locations.find((l) => l.id === locId)!;
    const optionIds = groups.map((g) => sel[g.kind]);
    const optsText = groups.map((g) => {
      const c = g.choices.find((o) => o.id === sel[g.kind])!;
      return `${g.label}: ${tx(c.choicePt, c.choiceEn)}`;
    });
    setOrder({
      productId: cur.id, optionIds, slotId,
      name: tx(cur.namePt, cur.nameEn),
      optsText, locName: loc.name, pickup: new Date(s.startsAt), total: price,
    });
    setCur(null); setCoOpen(true);
  }
  let toastTimer: any;
  function setToastMsg(m: string) { setToast(m); clearTimeout(toastTimer); toastTimer = setTimeout(() => setToast(""), 2200); }

  // "Última hora": produtos com algum horário disponível nas próximas 24h (respeitando antecedência e compatibilidade)
  const lastMinute = useMemo(() => {
    const now = Date.now(); const horizon = now + 24 * 3600 * 1000;
    return products.filter((p) => {
      if (soldOut(p)) return false;
      const minMs = now + (p.leadHours || 0) * 3600 * 1000;
      return slots.some((s) => {
        const ms = new Date(s.startsAt).getTime();
        if (ms < minMs || ms > horizon) return false;
        return (!s.productId || s.productId === p.id) && (!p.dedicatedSlotsOnly || s.productId === p.id);
      });
    });
  }, [products, slots]);

  const card = (p: Product) => (
    <div className="card" key={p.id} onClick={() => openProduct(p)} style={soldOut(p) ? { opacity: .6 } : undefined}>
      <div className="ph">
        {p.photos[0]
          ? <img src={p.photos[0].url} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          : <div className="fallback"><span>{tx(p.namePt, p.nameEn)}</span></div>}
        {(() => {
          const tagText = soldOut(p) ? t("sold_out") : (lowStock(p) ? t("left").replace("{n}", String(p.stock)) : tx(p.catPt, p.catEn));
          return tagText ? <div className="tag" style={soldOut(p) ? { color: "var(--ink-soft)" } : undefined}>{tagText}</div> : null;
        })()}
      </div>
      <div className="card-body">
        <h3>{tx(p.namePt, p.nameEn)}</h3>
        <div className="price">{eur(p.basePrice)}<small>{t("from")}</small></div>
      </div>
    </div>
  );

  return (
    <>
      <header>
        <div className="nav">
          <div className="monogram" aria-label="Sara Maia">
            <svg viewBox="0 0 100 100" fill="none" stroke="#3A3A38" strokeWidth="2.4">
              <rect x="6" y="6" width="88" height="88" />
              <line x1="50" y1="20" x2="50" y2="80" />
              <text x="29" y="60" fontFamily="Jost" fontSize="30" fill="#3A3A38" stroke="none" textAnchor="middle">S</text>
              <text x="71" y="60" fontFamily="Jost" fontSize="30" fill="#3A3A38" stroke="none" textAnchor="middle">M</text>
            </svg>
          </div>
          <span className="brandword">Sara Maia Pastry</span>
          <nav className="nav-links">
            <a href="#collection">{t("nav_cakes")}</a>
            <a href="#about">{t("nav_about")}</a>
            <div className="lang">
              <button className={lang === "pt" ? "on" : ""} onClick={() => setLang("pt")}>PT</button>
              <span style={{ opacity: .3 }}>/</span>
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
            </div>
            <button className="cart-btn" aria-label={t("nav_order")} title={t("nav_order")} onClick={() => setCoOpen(true)}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 7h12l-1 13H7L6 7z" />
                <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
              </svg>
              <span className="cart-count">{order ? 1 : 0}</span>
            </button>
          </nav>
        </div>
      </header>

      {lastMinute.length > 0 && (
        <section className="section" id="last-minute" style={{ paddingTop: 56, paddingBottom: 24 }}>
          <div className="sec-head">
            <div><span className="eyebrow">{t("lm_title")}</span></div>
            <span className="count">{t("lm_sub")}</span>
          </div>
          <div className="grid">{lastMinute.map(card)}</div>
        </section>
      )}

      <section className="section" id="collection" style={{ paddingTop: lastMinute.length > 0 ? 10 : 56 }}>
        <div className="sec-head">
          <div><span className="eyebrow">{t("col_eyebrow")}</span></div>
          <span className="count">{products.length} {lang === "pt" ? "referências" : "references"}</span>
        </div>
        <div className="grid">
          {products.map(card)}
        </div>
      </section>

      <section className="strip" id="about">
        <div className="strip-in">
          <div><span className="eyebrow">{t("ab_eyebrow")}</span><h2>{t("ab_title")}</h2><p>{t("ab_p")}</p></div>
        </div>
      </section>

      <footer>
        <div className="fnote">
          <div>Sara Maia Pastry</div>
          <div>Maia · Porto · Portugal</div>
          <div><a href="https://instagram.com/saramaiapastry" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>@saramaiapastry</a></div>
        </div>
      </footer>

      {/* SCRIM */}
      <div className={"scrim" + (cur || coOpen ? " show" : "")} onClick={closeAll} />

      {/* PRODUCT PANEL */}
      <div className={"panel product" + (cur ? " show" : "")}>
        {cur && (
          <>
            <div className="panel-head"><span className="eyebrow">{t("p_head")}</span><button className="x" onClick={closeAll}>✕</button></div>
            <div className="p-body">
              <div className="p-gallery">
                <div className="p-main-img"
                  onTouchStart={(e) => onSwipeStart(e.touches[0].clientX)}
                  onTouchEnd={(e) => onSwipeEnd(e.changedTouches[0].clientX)}
                  onMouseDown={(e) => onSwipeStart(e.clientX)}
                  onMouseUp={(e) => onSwipeEnd(e.clientX)}
                  style={{ touchAction: "pan-y", cursor: cur.photos.length > 1 ? "grab" : "default", userSelect: "none" }}>
                  {cur.photos[photoIdx] && <img src={cur.photos[photoIdx].url} alt="" draggable={false} />}
                  {cur.photos.length > 1 && (
                    <div className="p-dots">
                      {cur.photos.map((_, i) => (
                        <span key={i} className={i === photoIdx ? "on" : ""} onClick={() => setPhotoIdx(i)} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-thumbs">
                  {cur.photos.map((ph, i) => (
                    <button key={ph.id} className={i === photoIdx ? "on" : ""} onClick={() => setPhotoIdx(i)}><img src={ph.url} alt="" /></button>
                  ))}
                </div>
              </div>
              <div className="p-info">
                {tx(cur.catPt, cur.catEn) ? <span className="eyebrow">{tx(cur.catPt, cur.catEn)}</span> : null}
                <h2>{tx(cur.namePt, cur.nameEn)}</h2>
                <p className="p-desc">{tx(cur.descPt, cur.descEn)}</p>
                <div className="p-lead">
                  ◷ {cur.leadHours > 0 ? t("lead_h").replace("{n}", String(cur.leadHours)) : t("lead_now")}
                  {soldOut(cur) && <span style={{ marginLeft: 12, color: "var(--ink-soft)" }}>· {t("sold_out")}</span>}
                  {lowStock(cur) && <span style={{ marginLeft: 12 }}>· {t("left").replace("{n}", String(cur.stock))}</span>}
                </div>

                {groups.map((g) => (
                  <div className="opt-group" key={g.kind}>
                    <div className="lbl">{g.label}</div>
                    <div className="opts">{g.choices.map((o) => (
                      <button key={o.id} className={"opt" + (sel[g.kind] === o.id ? " on" : "")} onClick={() => setSel((prev) => ({ ...prev, [g.kind]: o.id }))}>
                        <span>{tx(o.choicePt, o.choiceEn)}</span>{o.priceDelta > 0 && <span className="delta">+{eur(o.priceDelta)}</span>}
                      </button>))}
                    </div>
                  </div>
                ))}

                <div className="pickup">
                  <div className="lbl-u" style={{ marginBottom: 10 }}>{t("pk_loc")}</div>
                  <div className="loc-row">{locations.map((L) => (
                    <button key={L.id} className={"opt" + (locId === L.id ? " on" : "")} onClick={() => { setLocId(L.id); setDayKey(null); setSlotId(null); }}>{L.name}</button>
                  ))}</div>
                  {(() => { const L = locations.find((l) => l.id === locId); return L?.instructions ? <p className="pickup-instr">{L.instructions}</p> : null; })()}

                  <Calendar lang={lang} cal={cal} setCal={setCal} daySlots={daySlots} dayKey={dayKey}
                    onPick={(k: string) => { setDayKey(k); setSlotId(null); }} />

                  <div className="slots">
                    {(dayKey && daySlots[dayKey] || []).map((s) => {
                      const d = new Date(s.startsAt); const hh = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
                      return <button key={s.id} className={"slot" + (slotId === s.id ? " on" : "")} onClick={() => setSlotId(s.id)}>{hh}</button>;
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-foot">
              <div className="p-total"><small>{t("p_total")}</small><b>{allGroupsChosen ? eur(price) : "—"}</b></div>
              <button className="btn" disabled={!ready} onClick={addToOrder}>{cur && soldOut(cur) ? t("sold_out") : t("p_add")}</button>
            </div>
          </>
        )}
      </div>

      {/* CHECKOUT PANEL */}
      <div className={"panel checkout" + (coOpen ? " show" : "")}>
        <div className="panel-head"><span className="eyebrow">{t("co_head")}</span><button className="x" onClick={closeAll}>✕</button></div>
        <div className="co-body">
          {!order ? (
            <div className="center"><p>{t("co_empty")}</p><button className="btn ghost" onClick={closeAll} style={{ marginTop: 12 }}>{t("co_browse")}</button></div>
          ) : (
            <Checkout lang={lang} order={order} onDone={() => { setOrder(null); closeAll(); }} setToast={setToastMsg} />
          )}
        </div>
      </div>

      <div className={"toast" + (toast ? " show" : "")}>{toast}</div>
    </>
  );
}

function Calendar({ lang, cal, setCal, daySlots, dayKey, onPick }: any) {
  const { y, m } = cal;
  const first = new Date(y, m, 1); const lead = (first.getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const cells: any[] = [];
  for (let i = 0; i < lead; i++) cells.push(<div key={"e" + i} className="day empty" />);
  for (let d = 1; d <= total; d++) {
    const k = `${y}-${m}-${d}`; const has = !!daySlots[k]; const past = new Date(y, m, d) < todayStart;
    const ok = has && !past;
    const cls = "day" + (ok ? " avail" : "") + (dayKey === k ? " sel" : "");
    cells.push(<div key={k} className={cls} onClick={() => ok && onPick(k)}>{d}</div>);
  }
  return (
    <div className="cal">
      <div className="cal-head">
        <span className="m">{MONTHS[lang as Lang][m]} {y}</span>
        <div className="cal-nav">
          <button onClick={() => setCal(prev(y, m, -1))}>‹</button>
          <button onClick={() => setCal(prev(y, m, 1))}>›</button>
        </div>
      </div>
      <div className="dow">{DOWS[lang as Lang].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="days">{cells}</div>
      <div className="cal-legend">
        <span><i style={{ background: "var(--ok)" }} />{T[lang as Lang].lg_avail}</span>
        <span><i style={{ background: "var(--line)" }} />{T[lang as Lang].lg_none}</span>
      </div>
    </div>
  );
}
function prev(y: number, m: number, d: number) { m += d; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { y, m }; }

/* ---------- Checkout with Stripe ---------- */
function Checkout({ lang, order, onDone, setToast }: any) {
  const t = (k: string) => T[lang as Lang][k] ?? k;
  const [mode, setMode] = useState<"guest" | "account">("guest");
  const [f, setF] = useState({ name: "", phone: "", email: "", pass: "", nif: "" });
  const [wantInvoice, setWantInvoice] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function startPayment() {
    if (!f.name || !f.phone || !f.email) { setToast(t("t_fill")); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: order.productId, optionIds: order.optionIds,
          slotId: order.slotId,
          customer: { name: f.name, phone: f.phone, email: f.email, nif: wantInvoice ? f.nif : null, wantInvoice },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setToast(data.error || "Erro"); setBusy(false); return; }
      setClientSecret(data.clientSecret);
    } catch { setToast("Erro de ligação"); }
    setBusy(false);
  }

  return (
    <>
      <div className="summary">
        <div className="row"><span>{order.name}</span><b style={{ color: "var(--ink)" }}>{eur(order.total)}</b></div>
        {(order.optsText || []).map((line: string, i: number) => (<div className="row" key={i}><span>{line}</span></div>))}
        <div className="row"><span>{order.locName}</span></div>
        <div className="row"><span>{order.pickup.toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        <div className="row tot"><span>Total</span><span>{eur(order.total)}</span></div>
      </div>

      {!clientSecret ? (
        <>
          <div className="seg">
            <button className={mode === "guest" ? "on" : ""} onClick={() => setMode("guest")}>{t("co_guest")}</button>
            <button className={mode === "account" ? "on" : ""} onClick={() => setMode("account")}>{t("co_account")}</button>
          </div>
          <div className="field"><label>{t("f_name")}</label><input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label>{t("f_phone")}</label><input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+351 ___ ___ ___" /></div>
          <div className="field"><label>{t("f_email")}</label><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
          {mode === "account" && <div className="field"><label>{t("f_pass")}</label><input type="password" value={f.pass} onChange={(e) => set("pass", e.target.value)} /></div>}
          <label className="check"><input type="checkbox" checked={wantInvoice} onChange={(e) => setWantInvoice(e.target.checked)} /><span>{t("f_inv")}</span></label>
          {wantInvoice && <div className="field"><label>{t("f_nif")}</label><input value={f.nif} onChange={(e) => set("nif", e.target.value)} inputMode="numeric" /></div>}

          <div className="lbl-u" style={{ margin: "18px 0 8px" }}>{t("co_pay")}</div>
          <div className="pays">
            <span className="pay"><b>Cartão</b></span><span className="pay"><b>MB</b> WAY</span>
            <span className="pay"><b>Revolut</b> Pay</span><span className="pay">Apple Pay</span><span className="pay"><b>G</b> Pay</span>
          </div>
          <button className="btn full" disabled={busy} onClick={startPayment}>{busy ? t("loading") : t("co_paybtn")}</button>
        </>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "flat", variables: { colorPrimary: "#8C5E68", fontFamily: "Inter, sans-serif" } } }}>
          <PayForm lang={lang} onDone={onDone} setToast={setToast} />
        </Elements>
      )}
    </>
  );
}

function PayForm({ lang, onDone, setToast }: any) {
  const t = (k: string) => T[lang as Lang][k] ?? k;
  const stripe = useStripe(); const elements = useElements(); const [busy, setBusy] = useState(false);
  async function confirm() {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + "/?paid=1" },
    });
    if (error) { setToast(error.message || "Erro no pagamento"); setBusy(false); }
    // Em métodos sem redirect, Stripe resolve aqui; o webhook confirma a encomenda.
  }
  return (
    <div className="stripe-box">
      <PaymentElement />
      <button className="btn full" style={{ marginTop: 16 }} disabled={busy} onClick={confirm}>{busy ? t("paying") : t("co_paybtn")}</button>
      <p className="note">{lang === "pt"
        ? "Pagamento seguro processado pela Stripe. A fatura é emitida automaticamente após confirmação."
        : "Secure payment processed by Stripe. The invoice is issued automatically after confirmation."}</p>
    </div>
  );
}
