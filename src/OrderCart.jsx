// === OrderCart — sticky right rail (v4+v5 Round 9) ===
// Single component: cart line items, promo (multi non-colliding), bill split,
// payment (KHQR + Cash), pregnancy consent gate, primary CTA "Check in & confirm order"
import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { I } from "./icons";
import { QRGlyph, mockInsurerDecide, playDrawerDing, DisabledTooltip, TatCompact } from "./shared";
import { useLang } from "./i18n";
import { ORDER_CATALOG } from "./orderCatalog";
import { getCoverage } from "./coverage";
import { printPatientReceipt } from "./PrintReceipt";

const KHR_RATE = 4100;
const fmtCcy = (usd, ccy) => ccy === "KHR" ? "៛" + Math.round(usd * KHR_RATE).toLocaleString() : "$" + usd.toFixed(2);
const receiptId = () => "R-" + Math.floor(10000 + Math.random() * 90000);

export function paymentDueAmount(cart, totals) {
  const previousPaid = Number(cart.payment?.previousPaidAmount || 0);
  if (cart.payment?.supplementalDue) return Math.max(0, totals.patientDue - previousPaid);
  return totals.patientDue;
}

export function paymentAfterPaidEdit(payment = {}, mode = "normal") {
  if (mode === "normal") return payment;
  const previousReceiptId = payment.receiptId || payment.previousReceiptId;
  const previousPaidAmount = Number(payment.amount || payment.previousPaidAmount || 0);
  const base = {
    ...payment,
    status: "idle",
    method: null,
    tendered: "",
    change: 0,
    receiptId: null,
    confirmedAt: null,
    amount: null,
  };
  if (mode === "void") {
    return {
      ...base,
      supplementalDue: false,
      previousReceiptId: null,
      previousPaidAmount: 0,
      voidedReceiptId: previousReceiptId,
      voidedAt: new Date().toISOString(),
    };
  }
  return {
    ...base,
    supplementalDue: true,
    previousReceiptId,
    previousPaidAmount,
  };
}

function confirmedPayment(cart, method, amount, ccy, extra = {}) {
  return {
    ...cart.payment,
    ...extra,
    status: "confirmed",
    method,
    receiptId: receiptId(),
    confirmedAt: new Date().toISOString(),
    amount,
    currency: ccy,
    cashier: "Linh Nguyen",
    supplementalDue: false,
  };
}

// === Master order catalogue ===
export { ORDER_CATALOG };

function KindGlyph({ kind, size = 14, strokeWidth = 1.75 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const glyphs = {
    visit: (
      <>
        <path d="M6.5 4.5v4.2a4.5 4.5 0 0 0 9 0V4.5" />
        <path d="M6.5 4.5H5" />
        <path d="M15.5 4.5H17" />
        <path d="M11 13.2v1.6a4 4 0 0 0 8 0v-.6" />
        <circle cx="19" cy="12.2" r="1.8" />
      </>
    ),
    lab: (
      <>
        <path d="M9 3.5h6" />
        <path d="M10 3.5v5.8l-4 8.2A2.1 2.1 0 0 0 7.9 20.5h8.2a2.1 2.1 0 0 0 1.9-3l-4-8.2V3.5" />
        <path d="M8.2 15h7.6" />
      </>
    ),
    imaging: (
      <>
        <path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5V8" />
        <path d="M16 5h1.5A1.5 1.5 0 0 1 19 6.5V8" />
        <path d="M19 16v1.5a1.5 1.5 0 0 1-1.5 1.5H16" />
        <path d="M8 19H6.5A1.5 1.5 0 0 1 5 17.5V16" />
        <path d="M8.7 12h6.6" />
      </>
    ),
    ecg: (
      <>
        <path d="M4 12h3.4l2-5 4 10 2-5H20" />
      </>
    ),
    vitals: (
      <>
        <path d="M19 8.8c0-2.1-1.5-3.8-3.6-3.8-1.4 0-2.5.7-3.4 1.8C11.1 5.7 10 5 8.6 5 6.5 5 5 6.7 5 8.8c0 3.1 3.1 5.6 7 9.2 3.9-3.6 7-6.1 7-9.2Z" />
      </>
    ),
    telecon: (
      <>
        <rect x="4.8" y="7" width="10.5" height="9.5" rx="2" />
        <path d="m15.3 10.2 4-2.2v7.5l-4-2.2" />
      </>
    ),
  };

  return <svg {...common}>{glyphs[kind] || glyphs.lab}</svg>;
}

const KIND_META = {
  visit:   { labelKey: "cart.kind.visit",   color: "#3a78a6", bg: "#edf6fb" },
  lab:     { labelKey: "cart.kind.lab",     color: "#168873", bg: "#edf8f5" },
  imaging: { labelKey: "cart.kind.imaging", color: "#bc7243", bg: "#fff3ec" },
  ecg:     { labelKey: "cart.kind.ecg",     color: "#af5b64", bg: "#fff2f4" },
  vitals:  { labelKey: "cart.kind.vitals",  color: "#756aa3", bg: "#f5f2fa" },
  telecon: { labelKey: "cart.kind.telecon", color: "#2f836c", bg: "#eff8f4" },
};
const KIND_ORDER = ["visit", "lab", "imaging", "ecg", "vitals", "telecon"];

const PROMO_CODES = {
  WELCOME10:  { type: "fixed",   value: 10, label: "$10 off first visit",   category: "first-visit" },
  STAFF20:    { type: "percent", value: 20, label: "20% off · staff",       category: "staff" },
  FAMILY5:    { type: "percent", value: 5,  label: "5% off · family",       category: "family" },
  FREEVISIT:  { type: "item",    value: 0,  label: "Free GP visit fee",     category: "item:visit-gp", targetItem: "visit-gp" },
  RAMADAN:    { type: "percent", value: 15, label: "15% off · seasonal",    category: "seasonal" },
};

function promoCollision(existing, code) {
  const newP = PROMO_CODES[code];
  if (!newP) return null;
  for (const [c, p] of Object.entries(existing)) {
    if (c === code) return { code: c, reason: `${code} is already applied` };
    if (p.category === newP.category) return { code: c, reason: `${code} conflicts with ${c} — same discount type` };
    if (p.type === "percent" && newP.type === "percent") return { code: c, reason: `${code} conflicts with ${c} — only one percentage discount allowed` };
  }
  return null;
}

const PAYER_LABELS = {
  direct:    { labelKey: "cart.payer.direct",    shortKey: "cart.payer.direct.short",    color: "#7a45ec" },
  insurance: { labelKey: "cart.payer.insurance", shortKey: "cart.payer.insurance.short", color: "#2087d6" },
  corporate: { labelKey: "cart.payer.corporate", shortKey: "cart.payer.corporate.short", color: "#06a07a" },
  family:    { labelKey: "cart.payer.family",    shortKey: "cart.payer.family.short",    color: "#d97757" },
  other:     { labelKey: "cart.payer.other",     shortKey: "cart.payer.other.short",     color: "#64748b" },
};

// === Pre-analytical question banks (cart-side, only for sensitive labs) ===
const PRE_ANALYTIC_QS = {
  fasting: { icon: "FlaskConical", color: "#d97757", labelKey: "cart.preq.fasting" },
  alcohol: { icon: "AlertCircle", color: "#d97757", labelKey: "cart.preq.alcohol" },
  drugs:   { icon: "AlertCircle", color: "#7a45ec", labelKey: "cart.preq.drugs" },
  vaccine: { icon: "Shield",      color: "#2087d6", labelKey: "cart.preq.vaccine" },
};
function preAnalyticReqs(item) {
  const reqs = [];
  if (item.fasting) reqs.push("fasting");
  if (item.alcohol) reqs.push("alcohol");
  if (item.drugs)   reqs.push("drugs");
  if (item.vaccine) reqs.push("vaccine");
  return reqs;
}

// === Cart shape ===
export function deriveCart(patient) {
  if (patient.cart && Array.isArray(patient.cart.items)) {
    const c = patient.cart;
    if (!c.promos) {
      const promos = {};
      if (c.promoCode && c.promoDiscount) promos[c.promoCode] = c.promoDiscount;
      return { ...c, promos, pregnancyConsent: c.pregnancyConsent || null };
    }
    return { pregnancyConsent: null, ...c };
  }
  const items = [{
    id: "visit-gp", kind: "visit", name: "GP consultation (visit fee)",
    price: 15, qty: 1, payer: patient.payer || "direct", status: "pending", auto: true,
  }];
  (patient.labTests || []).forEach(lt => {
    const cat = ORDER_CATALOG.find(c => c.id === lt.id);
    items.push({
      id: lt.id, kind: "lab", name: lt.name, price: lt.price, qty: 1,
      payer: patient.payer || "direct", status: lt.status || "pending",
      fasting: cat?.fasting, alcohol: cat?.alcohol, drugs: cat?.drugs, vaccine: cat?.vaccine,
    });
  });
  return {
    items,
    promos: {},
    splits: null,
    ccy: "USD",
    payment: { method: null, status: "idle", tendered: "" },
    pregnancyConsent: null,
  };
}

export function persistCart(patient, onUpdate, next) {
  const labTests = next.items.filter(i => i.kind === "lab").map(i => ({
    id: i.id, name: i.name, price: i.price, status: i.status || "pending",
  }));
  onUpdate({ ...patient, cart: next, labTests });
}

function cartItemResponsibility(item, insurance = []) {
  const gross = (item.price || 0) * (item.qty || 1);
  if ((item.payer || "direct") === "corporate") {
    return { patient: 0, insurance: 0, corporate: gross, gross, coverage: null };
  }

  const coverage = getCoverage(item.id, insurance);
  if (coverage?.kind === "covered") {
    const insurancePays = gross * ((coverage.percent || 0) / 100);
    return {
      patient: Math.max(0, gross - insurancePays),
      insurance: insurancePays,
      corporate: 0,
      gross,
      coverage,
    };
  }

  if ((item.payer || "direct") === "insurance") {
    const insurancePays = gross * 0.8;
    return {
      patient: Math.max(0, gross - insurancePays),
      insurance: insurancePays,
      corporate: 0,
      gross,
      coverage,
    };
  }

  return { patient: gross, insurance: 0, corporate: 0, gross, coverage };
}

export function cartTotals(cart, insurance = []) {
  const subtotal = cart.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const promos = cart.promos || {};
  const breakdown = [];
  let remaining = subtotal;
  for (const [code, p] of Object.entries(promos)) {
    if (p.type !== "item") continue;
    const tgt = cart.items.find(i => i.id === p.targetItem);
    const amt = tgt ? (tgt.price || 0) : 0;
    if (amt > 0) { breakdown.push({ code, label: p.label, amount: amt }); remaining -= amt; }
  }
  for (const [code, p] of Object.entries(promos)) {
    if (p.type !== "fixed") continue;
    const amt = Math.min(p.value, Math.max(0, remaining));
    if (amt > 0) { breakdown.push({ code, label: p.label, amount: amt }); remaining -= amt; }
  }
  for (const [code, p] of Object.entries(promos)) {
    if (p.type !== "percent") continue;
    const amt = Math.max(0, remaining) * (p.value / 100);
    if (amt > 0) { breakdown.push({ code, label: p.label, amount: amt }); remaining -= amt; }
  }
  const discount = breakdown.reduce((s, b) => s + b.amount, 0);
  const responsibility = cart.items.map(item => cartItemResponsibility(item, insurance));
  const insCoverage = responsibility.reduce((s, r) => s + r.insurance, 0);
  const insTotalRaw = responsibility.reduce((s, r) => s + (r.insurance > 0 ? r.gross : 0), 0);
  const insPatient = responsibility.reduce((s, r) => s + (r.insurance > 0 ? r.patient : 0), 0);
  const corpTotal = responsibility.reduce((s, r) => s + r.corporate, 0);
  const directTotal = responsibility.reduce((s, r) => s + (r.insurance === 0 && r.corporate === 0 ? r.patient : 0), 0);
  const patientDue  = responsibility.reduce((s, r) => s + r.patient, 0) - discount;
  const total       = subtotal - discount;
  return {
    subtotal, discount, total, breakdown,
    insCoverage, insPatient, corpTotal, directTotal,
    patientDue: Math.max(0, patientDue),
    insTotalRaw,
  };
}

// === Shared payment hook — used by OrderCart (steps 1–4) and Step5 main ===
//   Encapsulates: tendered UI state, method/ccy setters, confirm helpers, and
//   the KHQR auto-confirm timer. Returns the full prop set PaymentArea expects.
//
//   Note on double-mounting: when both the cart rail and Step5 main mount this
//   hook, the KHQR auto-confirm timer fires from both — but the confirm action
//   is idempotent (no-op if status is already "confirmed"). `tendered` is local
//   per-consumer; on Step 5 we hide the cart's PaymentArea so only one mount
//   has live state at a time.
export function useCartPayment(patient, onUpdate, onPushToast) {
  const tFn = useLang();
  const cart = useMemo(() => deriveCart(patient), [patient]);
  const totals = cartTotals(cart, patient.insurance || []);
  const [tendered, setTendered] = useState(cart.payment.tendered || "");
  const setCart = (next) => persistCart(patient, onUpdate, next);
  const due = paymentDueAmount(cart, totals);

  const setCcy = (ccy) => setCart({ ...cart, ccy });
  const setMethod = (m) =>
    setCart({ ...cart, payment: { ...cart.payment, method: m, status: m === "khqr" ? "waiting" : "idle" } });

  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - due;
  const cashOk = tenderedNum >= due && due > 0;

  const confirmKhqr = () => {
    if (cart.payment.status === "confirmed") return;
    setCart({
      ...cart,
      payment: confirmedPayment(cart, "khqr", due, cart.ccy || "USD"),
    });
    onPushToast?.(tFn("cart.pay.khqrReceived"));
  };

  // Mock Bakong webhook auto-confirm
  useEffect(() => {
    if (cart.payment.method !== "khqr") return;
    if (cart.payment.status !== "waiting") return;
    const id = setTimeout(() => {
      const latest = patient.cart;
      if (latest?.payment?.method === "khqr" && latest.payment?.status === "waiting") {
        confirmKhqr();
      }
    }, 5000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.payment.method, cart.payment.status]);

  const confirmCash = () => {
    if (cart.payment.status === "confirmed") return;
    const tenderedInUSD = (cart.ccy || "USD") === "KHR" ? tenderedNum / KHR_RATE : tenderedNum;
    const dinged = playDrawerDing();
    setCart({
      ...cart,
      payment: confirmedPayment(cart, "cash", due, cart.ccy || "USD", {
        tendered,
        change: tenderedInUSD - due,
      }),
    });
    onPushToast?.(dinged ? tFn("cart.pay.drawerDing") : tFn("cart.pay.cashRecorded"));
  };

  return {
    cart, totals,
    tendered, setTendered,
    onMethod: setMethod,
    onCcyToggle: setCcy,
    onConfirmCash: confirmCash,
    onConfirmKhqr: confirmKhqr,
    change, cashOk, tenderedNum,
    itemCount: cart.items.length,
  };
}

// === KHQR placeholder graphic ===
function KHQRGraphic({ size = 148 }) {
  const cells = useMemo(() => {
    const out = [];
    let r = 0xA73B;
    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        r = (r * 9301 + 49297) % 233280;
        const v = r / 233280;
        const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        if (finder) continue;
        if (v > 0.52) out.push({ x, y });
      }
    }
    return out;
  }, []);
  const cs = size / 23;
  return (
    <div style={{
      width: size + 14, height: size + 14, padding: 7,
      background: "white", borderRadius: 8,
      border: "3px solid #ed1c24",
      position: "relative",
    }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
        {[[0,0],[14,0],[0,14]].map(([fx, fy], i) => (
          <g key={i}>
            <rect x={fx*cs} y={fy*cs} width={cs*7} height={cs*7} fill="#000" />
            <rect x={(fx+1)*cs} y={(fy+1)*cs} width={cs*5} height={cs*5} fill="#fff" />
            <rect x={(fx+2)*cs} y={(fy+2)*cs} width={cs*3} height={cs*3} fill="#000" />
          </g>
        ))}
        {cells.map((c, i) => (
          <rect key={i} x={c.x*cs+1} y={c.y*cs+1} width={cs*1.6} height={cs*1.6} fill="#000" />
        ))}
      </svg>
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        background: "white", padding: "3px 5px", borderRadius: 3,
      }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="#ed1c24">
          <path d="M12 2 L18 6 L18 18 L12 22 L6 18 L6 6 Z" />
          <path d="M12 6 L15 8 L15 16 L12 18 L9 16 L9 8 Z" fill="white" />
        </svg>
      </div>
    </div>
  );
}


// === Bill Split Modal ===
function BillSplitModal({ open, cart, onClose, onSave }) {
  const t = useLang();
  const [draft, setDraft] = useState(cart);
  useEffect(() => { if (open) setDraft(cart); }, [open, cart]);
  if (!open) return null;
  const totals = cartTotals(draft);
  const setItemPayer = (id, payer) => {
    setDraft(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, payer } : i) }));
  };
  const groups = {};
  draft.items.forEach(i => {
    const p = i.payer || "direct";
    (groups[p] = groups[p] || []).push(i);
  });
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 820, maxHeight: "84vh", display: "flex", flexDirection: "column", padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("cart.split.title")}</h3>
            <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>{t("cart.split.sub")}</div>
          </div>
          <button onClick={onClose} className="icon-btn"><I.X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 320px" }}>
          <div style={{ padding: "12px 20px", borderRight: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 650, color: "var(--ink-500)", marginBottom: 6 }}>
              {t("cart.split.lineItems")}
            </div>
            {draft.items.map(item => {
              const meta = KIND_META[item.kind] || KIND_META.lab;
              return (
                <div key={item.id} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center", gap: 10,
                  padding: "8px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: meta.bg, color: meta.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <KindGlyph kind={item.kind} size={14} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-900)" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 1 }}>{t(meta.labelKey)} · ${(item.price || 0).toFixed(2)}</div>
                  </div>
                  <select className="select" value={item.payer || "direct"} onChange={e => setItemPayer(item.id, e.target.value)}
                    style={{ height: 30, width: 130, fontSize: 11.5, padding: "0 8px" }}>
                    {Object.entries(PAYER_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{t(v.labelKey)}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          <div style={{ padding: "12px 16px", background: "var(--surface-2)" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 650, color: "var(--ink-500)", marginBottom: 8 }}>
              {t("cart.split.childInvoices")}
            </div>
            {Object.entries(groups).map(([payer, items]) => {
              const meta = PAYER_LABELS[payer] || PAYER_LABELS.other;
              const sub = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
              return (
                <div key={payer} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: meta.color }} />
                      <span style={{ fontSize: 12, fontWeight: 650, color: "var(--ink-900)" }}>{t(meta.labelKey)}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${sub.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {items.map(i => (
                      <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-600)" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{i.name}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>${(i.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {payer === "insurance" && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--border-strong)", fontSize: 10.5, color: "var(--ink-500)" }}>
                      {t("cart.split.insBreakdown", { copay: (sub * 0.2).toFixed(2) })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
            {t("cart.split.summary", { n: Object.keys(groups).length, total: totals.subtotal.toFixed(2) })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>{t("modal.cancel")}</button>
            <button className="btn btn-primary" onClick={() => onSave(draft)}>
              <I.Check size={14} /> {t("cart.split.apply")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// === Pregnancy Consent Modal ===
// Spec v12 §1 — Verbal consent fallback for sensitive tests
//   Used when the patient has no phone or refuses the digital consent flow.
//   Sensitive tests (HIV, STI, genetic, pregnancy) require a supervisor PIN
//   because verbal consent is more abusable than digital — the PIN means
//   another staff member witnessed it, with audit trail.
//
//   Non-sensitive items (e.g. plain imaging) skip the PIN gate.
//
function VerbalConsentModal({ open, item, isSensitive, onConfirm, onCancel }) {
  const [nurseName, setNurseName] = useState("");
  const [pin, setPin] = useState("");
  const [pregAnswer, setPregAnswer] = useState(null);
  useEffect(() => {
    if (open) { setNurseName(""); setPin(""); setPregAnswer(null); }
  }, [open]);
  if (!open || !item) return null;
  const askPregnancy = item.kind === "imaging" || item.id === "preg-bhcg";
  const pinOk = !isSensitive || pin.length >= 4;
  const pregOk = !askPregnancy || pregAnswer !== null;
  const canConfirm = nurseName.trim().length > 1 && pinOk && pregOk;
  const submit = () => {
    if (!canConfirm) return;
    onConfirm({
      consent: "verbal",
      sensitive: isSensitive,
      by: nurseName.trim(),
      supervisorPin: isSensitive ? pin : null,
      pregnancyAnswer: askPregnancy ? pregAnswer : undefined,
      at: new Date().toISOString(),
    });
  };
  return createPortal(
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520, padding: 0 }} role="dialog" aria-modal="true">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--brand-50)", color: "var(--brand-600)", display: "grid", placeItems: "center" }}>
            <I.MessageSquare size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Verbal consent — {item.name}</h3>
            <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>
              Use only when the patient has no phone or refuses the digital consent flow.
            </div>
          </div>
          <button onClick={onCancel} className="icon-btn"><I.X size={16} /></button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-700)" }}>
            Confirm the following was asked and answered verbally with the patient.
          </p>

          {askPregnancy && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 650, color: "var(--ink-900)", marginBottom: 8 }}>
                Is there any chance the patient could be pregnant?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { v: "no", label: "Not pregnant" },
                  { v: "yes", label: "Possibly pregnant" },
                  { v: "declined", label: "Declined to answer" },
                ].map(o => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setPregAnswer(o.v)}
                    style={{
                      padding: "8px",
                      border: "1.5px solid " + (pregAnswer === o.v ? "var(--brand-500)" : "var(--border-strong)"),
                      borderRadius: 6,
                      background: pregAnswer === o.v ? "var(--brand-50)" : "var(--surface)",
                      color: pregAnswer === o.v ? "var(--brand-700)" : "var(--ink-700)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Confirmed by (nurse name) <span className="req">*</span></label>
            <input
              className="input"
              value={nurseName}
              onChange={e => setNurseName(e.target.value)}
              placeholder="e.g. Linh Nguyen"
              autoFocus
              style={{ height: 32, fontSize: 12.5 }}
            />
          </div>

          {isSensitive && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">
                Supervisor witness PIN <span className="req">*</span>
                <span style={{ marginLeft: 6, fontSize: 10.5, color: "var(--warn-600)", fontWeight: 600 }}>
                  required for sensitive tests
                </span>
              </label>
              <input
                className="input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                style={{ height: 32, fontSize: 14, fontFamily: "'SF Mono', ui-monospace, monospace", letterSpacing: "0.3em", textAlign: "center", maxWidth: 160 }}
              />
              <div className="help" style={{ fontSize: 10.5, color: "var(--ink-500)", marginTop: 4 }}>
                Override is logged with timestamp + nurse + supervisor IDs.
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, background: "var(--surface-2)" }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canConfirm}>
            <I.Check size={13} /> Save verbal consent
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PregnancyConsentModal({ open, patient, pendingItems, onConfirm, onCancel }) {
  const t = useLang();
  const [answer, setAnswer] = useState(null);
  const [override, setOverride] = useState(false);
  const [signedBy, setSignedBy] = useState("");
  useEffect(() => { if (open) { setAnswer(null); setOverride(false); setSignedBy(""); } }, [open]);
  if (!open) return null;
  const needsOverride = answer === "yes" || answer === "unsure";
  const canConfirm = answer === "no" || (needsOverride && override && signedBy.trim().length > 1);
  const submit = () => {
    if (!canConfirm) return;
    onConfirm({ answer, overrideOk: needsOverride ? override : undefined, by: needsOverride ? signedBy.trim() : undefined, at: new Date().toISOString() });
  };
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520, padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#fff1f2", color: "#be123c", display: "grid", placeItems: "center" }}>
            <I.AlertTriangle size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t("cart.preg.title")}</h3>
            <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>
              {patient.name} · {patient.sexAtBirth || "—"} · {t("cart.preg.sub")}
            </div>
          </div>
          <button onClick={onCancel} className="icon-btn"><I.X size={16} /></button>
        </div>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 650, color: "var(--ink-500)", marginBottom: 4 }}>
            {t("cart.preg.awaiting")}
          </div>
          {(pendingItems || []).map(i => (
            <div key={i.id} style={{ fontSize: 12.5, color: "var(--ink-800)", display: "flex", justifyContent: "space-between" }}>
              <span>{i.name}</span><span style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink-500)" }}>${(i.price || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 650, color: "var(--ink-900)", marginBottom: 10 }}>
            {t("cart.preg.q")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { v: "no",     labelKey: "cart.preg.no",     subKey: "cart.preg.no.sub",     color: "#06a07a" },
              { v: "yes",    labelKey: "cart.preg.yes",    subKey: "cart.preg.yes.sub",    color: "#be123c" },
              { v: "unsure", labelKey: "cart.preg.unsure", subKey: "cart.preg.unsure.sub", color: "#d97757" },
            ].map(o => {
              const active = answer === o.v;
              return (
                <button key={o.v} type="button" onClick={() => setAnswer(o.v)}
                  style={{
                    padding: "10px 8px",
                    background: active ? o.color + "12" : "var(--surface)",
                    border: "1.5px solid " + (active ? o.color : "var(--border-strong)"),
                    borderRadius: 8, cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: active ? o.color : "var(--ink-900)" }}>{t(o.labelKey)}</span>
                  <span style={{ fontSize: 10.5, color: "var(--ink-500)" }}>{t(o.subKey)}</span>
                </button>
              );
            })}
          </div>
          {answer === "no" && (
            <div style={{
              padding: "10px 12px", borderRadius: 7,
              background: "var(--success-50)", border: "1px solid var(--success-200, #a7f3d0)",
              fontSize: 12, color: "var(--success-700, #047857)",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <I.Check size={13} /> {t("cart.preg.notPregnantNote")}
            </div>
          )}
          {needsOverride && (
            <div style={{ padding: 12, borderRadius: 7, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div style={{ fontSize: 12, fontWeight: 650, color: "#991b1b", marginBottom: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <I.AlertTriangle size={12} /> {t("cart.preg.advisory")}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-700)", lineHeight: 1.5, marginBottom: 10 }}>
                {t("cart.preg.advisoryBody")}
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--ink-800)", cursor: "pointer", marginBottom: 8 }}>
                <input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} style={{ marginTop: 2 }} />
                <span>{t("cart.preg.overrideCheck")}</span>
              </label>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">{t("cart.preg.signoff")} <span className="req">*</span></label>
                <input className="input" value={signedBy} onChange={e => setSignedBy(e.target.value)}
                  placeholder={t("cart.preg.signoffPlaceholder")} style={{ height: 32, fontSize: 12.5 }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-2)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-500)" }}>
            {t("cart.preg.recordedAgainst")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={onCancel}>{t("cart.preg.cancelOrder")}</button>
            <button className="btn btn-primary" onClick={submit} disabled={!canConfirm}>
              <I.Check size={13} /> {t("cart.preg.recordAdd")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === Cart Line ===
// Round 12 #1 — Always compact (~36px) cart row.
//   Layout: [icon] name [status icons] · price · [×]
//   Payer tag is tucked into a hover tooltip (title attr on the row).
//   Validation / policy info collapses to small badge icons that expand inline on click.
function CartLine({ item, onRemove, onSendValidation, isLast, ccy, t, policyDecision, coverage, hideValidationLabel }) {
  const meta = KIND_META[item.kind] || KIND_META.lab;
  const payerMeta = PAYER_LABELS[item.payer] || PAYER_LABELS.direct;
  const requiresValidation = item.kind === "imaging";
  const validationState = item.validationState || "idle"; // idle | sending | sent | signed
  const validationUnresolved = requiresValidation && validationState !== "signed" && validationState !== "verbal";
  const lockedAutoItem = item.auto && item.kind === "visit";
  const showPolicyNote = item.payer === "insurance" && policyDecision && policyDecision.status !== "covered";
  const [openExpand, setOpenExpand] = useState(null); // null | "validation" | "policy"

  const rowTitle = `${t(payerMeta.labelKey)}`; // hover tooltip = payer name
  const validationBadgeTone =
    validationState === "signed" ? "success" :
    validationState === "sent"   ? "info" :
                                   "warn";
  const gross = (item.price || 0) * (item.qty || 1);
  const insurancePays = coverage?.kind === "covered" ? gross * ((coverage.percent || 0) / 100) : 0;
  const patientPays = Math.max(0, gross - insurancePays);

  return (
    <div className={"cart-line cart-line-compact" + (isLast ? " is-last" : "")} data-payer={item.payer}>
      <div
        className="cart-line-row"
        title={rowTitle}
      >
        <div className="cart-line-ico" style={{ background: meta.bg, color: meta.color }}>
          <KindGlyph kind={item.kind} size={14} strokeWidth={1.75} />
        </div>
        <div className="cart-line-name">
          <div className="cart-line-titlebar">
            <span className="cart-line-name-text">{item.name}</span>
            {requiresValidation && (
              <button
                type="button"
                className={"cart-line-badge cart-line-badge-" + validationBadgeTone}
                onClick={(e) => { e.stopPropagation(); setOpenExpand(o => o === "validation" ? null : "validation"); }}
                title={
                  validationState === "signed" ? t("validate.signed") :
                  validationState === "sent"   ? t("validate.sent")   :
                                                 t("validate.requiresPatient")
                }
                aria-label={t("validate.requiresPatient")}
                aria-expanded={openExpand === "validation" || validationUnresolved}
              >
                {validationState === "signed"
                  ? <I.ShieldCheck size={10} strokeWidth={2.5} />
                  : <I.AlertTriangle size={10} />}
              </button>
            )}
            {showPolicyNote && (
              <button
                type="button"
                className={"cart-line-badge cart-line-badge-" + (policyDecision.status === "outOfPolicy" ? "danger" : "warn")}
                onClick={(e) => { e.stopPropagation(); setOpenExpand(o => o === "policy" ? null : "policy"); }}
                title={policyDecision.reason}
                aria-label={t("cart.policy.note")}
              >
                <I.AlertCircle size={10} />
              </button>
            )}
            {coverage && (
              <span className={"cart-line-coverage atp-cov atp-cov-" + (
                coverage.kind === "covered" ? "yes" :
                coverage.kind === "not-covered" ? "no" :
                coverage.kind === "preauth" ? "preauth" : "unsure"
              )}>
                {coverage.kind === "covered" && <><I.Check size={9} strokeWidth={3} /> {coverage.insurer} {coverage.percent}%</>}
                {coverage.kind === "not-covered" && <><I.X size={9} /> Not covered</>}
                {coverage.kind === "unconfirmed" && <>? Unconfirmed</>}
                {coverage.kind === "preauth" && <><I.Lock size={9} /> Pre-auth</>}
              </span>
            )}
          </div>
          {insurancePays > 0 && (
            <span className="cart-line-responsibility">
              Patient {fmtCcy(patientPays, ccy)} · {coverage.insurer} {fmtCcy(insurancePays, ccy)}
            </span>
          )}
        </div>
        <div className="cart-line-price">
          {item.price === 0 ? "—" : fmtCcy((item.price || 0) * (item.qty || 1), ccy)}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={lockedAutoItem}
          className={"cart-line-remove" + (lockedAutoItem ? " disabled" : "")}
          title={lockedAutoItem ? t("cart.autoVisitFee") : t("cart.remove")}
        >
          <I.X size={10} strokeWidth={2.5} />
        </button>
      </div>
      {(openExpand === "validation" || validationUnresolved) && (
        <div
          className={"cart-line-expand cart-line-validation-panel" + (validationUnresolved ? " next-action-target" : "")}
          data-next-action={validationUnresolved ? "imaging-consent" : undefined}
          tabIndex={validationUnresolved ? -1 : undefined}
          aria-label={validationUnresolved ? "Consent needed before imaging" : undefined}
        >
          {validationState === "idle" ? (
            <>
              <div className="cart-line-validation-copy">
                <I.ClipboardList size={11} />
                <span>Consent needed before imaging.</span>
              </div>
              <div className="cart-line-validation-actions">
                <button
                  type="button"
                  onClick={onSendValidation}
                  className="cart-line-action cart-line-action-primary"
                >
                  <I.Smartphone size={10} /> Send sign-off
                </button>
                {/* Spec v12 §1 — Verbal consent fallback for no-phone patients */}
                {item.onVerbalConsent && (
                  <button
                    type="button"
                    onClick={item.onVerbalConsent}
                    className="cart-line-action cart-line-action-warning"
                  >
                    <I.MessageSquare size={10} /> Verbal consent
                  </button>
                )}
              </div>
            </>
          ) : validationState === "sent" ? (
            <div className="cart-line-validation-copy">
              <span className="spinner" style={{ width: 8, height: 8, borderWidth: 1 }} />
              <span>{t("validate.sent")} · waiting for patient signature</span>
            </div>
          ) : validationState === "verbal" ? (
            <span className="cart-line-action-info" style={{ color: "var(--ink-700)" }}>
              <I.MessageSquare size={10} /> Verbal consent · {item.consentBy || "nurse"} · {item.consentAt?.slice(11, 16) || ""}
            </span>
          ) : (
            <span className="cart-line-action-info success">
              <I.ShieldCheck size={10} /> {t("validate.signed")}
            </span>
          )}
        </div>
      )}
      {openExpand === "policy" && showPolicyNote && (
        <div className="cart-line-expand">
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <I.Shield size={10} />
            <span style={{ fontWeight: 700 }}>
              {policyDecision.status === "outOfPolicy"
                ? t("cart.policy.outOfPolicy")
                : `${policyDecision.coveredPct}% ${t("cart.policy.partial")}`}
            </span>
          </div>
          <div style={{ color: "var(--ink-700)" }}>{policyDecision.reason}</div>
          {policyDecision.status === "outOfPolicy" && (
            <div style={{ marginTop: 2, color: "var(--danger-600)", fontWeight: 600 }}>
              → {t("cart.policy.cashOnly")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Payment Area ===
export function PaymentArea({ patient, cart, totals, tendered, setTendered, onMethod, onCcyToggle, onConfirmCash, onConfirmKhqr, change, cashOk, tenderedNum, itemCount, t, paymentReady = true, paymentReasons = [], onPushToast }) {
  const ccy = cart.ccy || "USD";
  const status = cart.payment.status;
  const method = cart.payment.method;
  const due = paymentDueAmount(cart, totals);
  const dueLabel = fmtCcy(due, ccy);

  // v9 §10 — KHQR CFD-driven flow.
  //   Nurse no longer sees the QR (it's on the customer-facing display).
  //   Nurse sees: "Bakong webhook listening" status + countdown.
  //   Auto-confirms after ~4s (mocks real Bakong webhook) OR nurse clicks
  //   "Mark as received" → inline confirmation prompt → confirm.
  //   10-minute countdown to expiry; expired offers Regenerate.
  const inKhqrWaiting = method === "khqr" && status === "waiting";
  const [khqrSecsLeft, setKhqrSecsLeft] = useState(0);
  const [khqrExpired, setKhqrExpired] = useState(false);
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false);
  const [khqrSession, setKhqrSession] = useState(0); // bump to restart session after Regenerate

  React.useEffect(() => {
    if (!inKhqrWaiting) {
      setKhqrSecsLeft(0); setKhqrExpired(false); setManualConfirmOpen(false);
      return;
    }
    setKhqrSecsLeft(10 * 60);
    setKhqrExpired(false);
    const auto = setTimeout(() => onConfirmKhqr(), 4000);
    return () => clearTimeout(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inKhqrWaiting, khqrSession]);

  React.useEffect(() => {
    if (!inKhqrWaiting || khqrExpired) return;
    if (khqrSecsLeft <= 0) { setKhqrExpired(true); return; }
    const tick = setTimeout(() => setKhqrSecsLeft(s => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [khqrSecsLeft, inKhqrWaiting, khqrExpired]);

  const fmtClock = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const regenerateKhqr = () => setKhqrSession(s => s + 1);

  if (status === "confirmed") {
    const methodLabel = method === "cash" ? t("cart.pay.cash") : "KHQR";
    const confirmedAt = cart.payment.confirmedAt ? new Date(cart.payment.confirmedAt) : null;
    const confirmedTime = confirmedAt && !Number.isNaN(confirmedAt.getTime())
      ? confirmedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—";
    const paidAmount = Number(cart.payment.amount ?? due);
    const paidCurrency = cart.payment.currency || ccy;
    return (
      <div className="pay-confirmed">
        <div className="pay-confirmed-head">
          <div className="pay-confirmed-mark">
            <I.Check size={14} strokeWidth={3} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pay-confirmed-title">{t("cart.pay.confirmed")}</div>
            <div className="pay-confirmed-time">
              {confirmedTime}
            </div>
          </div>
        </div>
        <dl className="pay-confirmed-grid">
          <div>
            <dt>{t("pay.amount")}</dt>
            <dd className="pay-confirmed-amount">{fmtCcy(paidAmount, paidCurrency)}</dd>
          </div>
          <div>
            <dt>{t("pay.title")}</dt>
            <dd>{methodLabel}</dd>
          </div>
          <div>
            <dt>{t("pay.receiptNo")}</dt>
            <dd className="mono">#{cart.payment.receiptId}</dd>
          </div>
        </dl>
        <div className="pay-confirmed-send-label">{t("cart.pay.sendReceipt") || "Send receipt"}</div>
        <div className="pay-confirmed-actions pay-confirmed-actions-grid">
          <button
            type="button"
            className="pay-receipt-btn"
            onClick={() => {
              if (!patient) return;
              printPatientReceipt(patient);
              onPushToast?.(t("cart.pay.printToast") || "Opening receipt for print…", "info");
            }}
          >
            <I.Printer size={14} /> <span>{t("cart.pay.print") || "Print"}</span>
          </button>
          <button
            type="button"
            className="pay-receipt-btn"
            onClick={() => onPushToast?.(t("cart.pay.smsToast") || `Receipt SMS queued${patient?.phoneNumber ? " · " + patient.phoneNumber : ""}`, "success")}
          >
            <I.MessageSquare size={14} /> <span>SMS</span>
          </button>
          <button
            type="button"
            className="pay-receipt-btn"
            onClick={() => onPushToast?.(t("cart.pay.emailToast") || `Receipt emailed${patient?.email ? " · " + patient.email : ""}`, "success")}
          >
            <I.Mail size={14} /> <span>Email</span>
          </button>
          <button
            type="button"
            className="pay-receipt-btn"
            onClick={() => onPushToast?.(t("cart.pay.telegramToast") || `Receipt sent on Telegram${patient?.telegramHandle ? " · @" + patient.telegramHandle : ""}`, "success")}
          >
            <I.Send size={14} /> <span>Telegram</span>
          </button>
        </div>
        <div className="pay-confirmed-foot">{t("cart.pay.receiptFoot") || "Receipt available at counter. Sends to phone & channels on file."}</div>
      </div>
    );
  }

  if (!method) {
    return (
      <div className="cart-payment-methods" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div className="between" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 650, color: "var(--ink-500)" }}>
            {t("cart.pay.title")}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 5, padding: 2 }}>
            {["USD", "KHR"].map(c => {
              const active = ccy === c;
              return (
                <button key={c} type="button" onClick={() => onCcyToggle(c)}
                  style={{
                    padding: "2px 8px", border: "none",
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--ink-900)" : "var(--ink-500)",
                    fontSize: 10.5, fontWeight: 700, cursor: "pointer",
                    borderRadius: 4, boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}>{c}</button>
              );
            })}
          </div>
        </div>
        {/* Round 12 #2 — payment methods get the same disabled-tooltip treatment. */}
        {(() => {
          const payDisabled = itemCount === 0 || due === 0 || !paymentReady;
          const payReasons = [];
          if (itemCount === 0) payReasons.push(t("disabled.payment.empty"));
          else if (due === 0) payReasons.push(t("disabled.payment.zero"));
          if (itemCount > 0 && due > 0 && !paymentReady) payReasons.push(...paymentReasons);
          const payProps = {
            disabled: payDisabled,
            title: t("disabled.payment.title"),
            reasons: payReasons,
          };
          return (
            <div className="cart-payment-method-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <DisabledTooltip block {...payProps}>
                <button className="cart-payment-method-btn" onClick={() => onMethod("khqr")} disabled={payDisabled}
                  style={{
                    width: "100%",
                    padding: "10px 8px", border: "1.5px solid var(--border-strong)", borderRadius: 7, background: "var(--surface)",
                    cursor: payDisabled ? "not-allowed" : "pointer",
                    opacity: payDisabled ? 0.5 : 1,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                  <QRGlyph size={18} />
                  <span style={{ fontSize: 11.5, fontWeight: 650, color: "var(--ink-900)" }}>KHQR</span>
                </button>
              </DisabledTooltip>
              <DisabledTooltip block {...payProps}>
                <button className="cart-payment-method-btn" onClick={() => onMethod("cash")} disabled={payDisabled}
                  style={{
                    width: "100%",
                    padding: "10px 8px", border: "1.5px solid var(--border-strong)", borderRadius: 7, background: "var(--surface)",
                    cursor: payDisabled ? "not-allowed" : "pointer",
                    opacity: payDisabled ? 0.5 : 1,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                  <I.Wallet size={18} style={{ color: "var(--ink-700)" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 650, color: "var(--ink-900)" }}>{t("cart.pay.cash")}</span>
                </button>
              </DisabledTooltip>
            </div>
          );
        })()}
        {due === 0 && itemCount > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-500)", textAlign: "center" }}>
            {t("cart.pay.fullyCovered")}
          </div>
        )}
      </div>
    );
  }

  if (method === "khqr") {
    return (
      <div className="khqr-cfd" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <button onClick={() => onMethod(null)} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--ink-600)", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <I.ChevronLeft size={12} /> {t("cart.pay.back")}
          </button>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-900)" }}>KHQR · {dueLabel}</div>
        </div>

        {khqrExpired ? (
          // v9 §10 — 10-min timeout. Nurse must regenerate.
          <div className="khqr-cfd-panel khqr-cfd-expired">
            <div className="khqr-cfd-row">
              <I.AlertTriangle size={14} style={{ color: "var(--warn-600)" }} />
              <span className="khqr-cfd-status">{t("cart.pay.khqrExpired")}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={regenerateKhqr}>
              <I.RefreshCw size={11} /> {t("cart.pay.khqrRegenerate")}
            </button>
          </div>
        ) : (
          <div className="khqr-cfd-panel">
            {/* Bakong webhook live indicator (the QR itself is on the CFD) */}
            <div className="khqr-cfd-live">
              <span className="khqr-cfd-live-dot" />
              <I.Wifi size={11} />
              <span>{t("cart.pay.khqrLive")}</span>
              <span className="khqr-cfd-clock">
                <I.Clock size={10} /> {fmtClock(khqrSecsLeft)}
              </span>
            </div>
            <div className="khqr-cfd-msg">
              <I.Smartphone size={11} /> {t("cart.pay.khqrCfdMsg")}
            </div>
            <div className="khqr-cfd-msg-sub">
              <span className="spinner" style={{ width: 9, height: 9, borderWidth: 1.5 }} />
              {t("cart.pay.khqrAuto")}
            </div>

            {/* Manual fallback — requires explicit confirmation per v9 §10 */}
            {manualConfirmOpen ? (
              <div className="khqr-cfd-confirm" role="alertdialog">
                <div className="khqr-cfd-confirm-q">
                  {t("cart.pay.confirmManualQ", { amount: dueLabel })}
                </div>
                <div className="khqr-cfd-confirm-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setManualConfirmOpen(false)}>
                    {t("modal.cancel")}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setManualConfirmOpen(false); onConfirmKhqr(); }}>
                    <I.Check size={11} /> {t("cart.pay.confirmManualYes")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-sm khqr-cfd-fallback"
                onClick={() => setManualConfirmOpen(true)}
                title={t("cart.pay.markReceivedHint")}
              >
                <I.Check size={11} /> {t("cart.pay.markReceived")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (method === "cash") {
    const tenderedInUSD = ccy === "KHR" ? (tenderedNum / KHR_RATE) : tenderedNum;
    const changeUSD = tenderedInUSD - due;
    const symbol = ccy === "KHR" ? "៛" : "$";
    return (
      <div className="cart-pay-cash" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div className="between" style={{ marginBottom: 8 }}>
          <button onClick={() => onMethod(null)} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--ink-600)", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <I.ChevronLeft size={12} /> {t("cart.pay.back")}
          </button>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-900)" }}>{t("cart.pay.cash")} · {dueLabel}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-600)" }}>{t("cart.pay.tendered")} ({ccy})</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-500)", fontSize: 13, fontWeight: 600 }}>{symbol}</span>
            <input className="input cart-pay-cash-input" value={tendered} onChange={e => setTendered(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder={ccy === "KHR" ? "0" : "0.00"} inputMode="decimal"
              style={{ height: 32, fontSize: 13, fontVariantNumeric: "tabular-nums", fontWeight: 600, paddingLeft: 24 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, padding: "4px 0" }}>
            <span style={{ color: "var(--ink-600)" }}>{t("cart.pay.change")}</span>
            <span style={{
              fontWeight: 700, fontVariantNumeric: "tabular-nums",
              color: tenderedNum === 0 ? "var(--ink-400)"
                : changeUSD < 0 ? "var(--danger-500)"
                : changeUSD === 0 ? "var(--ink-700)"
                : "var(--success-700, #047857)",
            }}>
              {changeUSD < 0 ? "−" : ""}{fmtCcy(Math.abs(changeUSD), ccy)}
            </span>
          </div>
          <button className="btn btn-primary cart-pay-cash-confirm" onClick={onConfirmCash} disabled={!paymentReady || !(tenderedInUSD >= due && due > 0)} style={{ height: 34, marginTop: 2 }}>
            <I.Check size={14} /> {t("cart.pay.confirmCash")}
          </button>
        </div>
      </div>
    );
  }
  return null;
}

// === Main OrderCart ===
//   The cart is the always-visible rail for Steps 1–4. It owns payment (KHQR /
//   Cash) and the Complete check-in CTA — there is no longer a separate Step 5
//   panel that mirrors it.
export function OrderCart({ patient, onUpdate, onPushToast, onCheckIn, identityComplete, currentStep = 1, requestPaidEdit, onOpenAdd, onOpenPay, payerReady = true, blankState = false }) {
  const t = useLang();
  const cart = useMemo(() => deriveCart(patient), [patient]);
  const totals = cartTotals(cart, patient.insurance || []);
  const [splitOpen, setSplitOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [tendered, setTendered] = useState(cart.payment.tendered || "");
  const [pregOpen, setPregOpen] = useState(false);
  const [pendingPregItems, setPendingPregItems] = useState(null);
  // Spec v12 §1 — verbal consent fallback. The state machine is per-item:
  // open the modal for a specific cart line; on save, mark validation
  // "verbal" and store who captured it for the audit trail.
  const [verbalForItemId, setVerbalForItemId] = useState(null);
  // Round 12 #1 — collapse state per kind. Resets on reload (no persistence by design).
  const [collapsedKinds, setCollapsedKinds] = useState(() => new Set());
  const [billExpanded, setBillExpanded] = useState(false);
  const toggleKindCollapsed = (kind) => {
    setCollapsedKinds(prev => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  };

  const setCart = (next) => persistCart(patient, onUpdate, next);

  const itemCount = cart.items.length;
  const isPaid = cart.payment.status === "confirmed";
  const isCheckedIn = !!patient.checkedInAt || patient.status?.label === "Checked in";
  const grouped = {};
  cart.items.forEach(i => { (grouped[i.kind] = grouped[i.kind] || []).push(i); });
  const guardPaidCartEdit = (description, buildNext) => {
    if (isPaid && requestPaidEdit) {
      requestPaidEdit(description, (mode) => setCart(buildNext(mode)));
      return { deferred: true };
    }
    setCart(buildNext("normal"));
    return { deferred: false };
  };

  const PREG_GATE_KINDS = new Set(["imaging"]);
  const itemNeedsPregGate = (c) => patient.sexAtBirth === "Female" && PREG_GATE_KINDS.has(c.kind);

  const handlePregConsent = (consent) => {
    setCart({ ...cart, pregnancyConsent: consent, items: [...cart.items, ...(pendingPregItems || [])] });
    onPushToast?.(t("cart.preg.recorded"));
    setPendingPregItems(null);
    setPregOpen(false);
  };
  const handlePregCancel = () => {
    setPendingPregItems(null);
    setPregOpen(false);
    onPushToast?.(t("cart.preg.cancelled"), "error");
  };

  const removeItem = (id) => {
    const item = cart.items.find(i => i.id === id);
    guardPaidCartEdit(`Remove ${item?.name || "this order"} from a paid visit?`, (mode) => ({
      ...cart,
      items: cart.items.filter(i => i.id !== id),
      payment: paymentAfterPaidEdit(cart.payment, mode),
    }));
  };

  // === Clear all — drops every removable item (auto items like the visit fee stay).
  const removableCount = cart.items.filter(i => !(i.auto && i.kind === "visit")).length;
  const handleClearAll = () => {
    if (removableCount === 0) return;
    const previousCart = cart;
    const result = guardPaidCartEdit(`Clear ${removableCount} order${removableCount === 1 ? "" : "s"} from a paid visit?`, (mode) => ({
      ...cart,
      items: cart.items.filter(i => i.auto && i.kind === "visit"),
      payment: paymentAfterPaidEdit(cart.payment, mode),
    }));
    if (result?.deferred) return;
    onPushToast?.(t("cart.clear.toast", { n: removableCount }), "success", {
      actionLabel: "Undo",
      onAction: () => setCart(previousCart),
    });
  };

  // === Patient-side validation for imaging (chain of custody) ===
  const sendValidation = (id) => {
    setCart({
      ...cart,
      items: cart.items.map(i => i.id === id ? { ...i, validationState: "sent" } : i),
    });
    onPushToast?.(t("validate.sent"));
    // mock the patient tap-to-sign 1.8s later
    setTimeout(() => {
      const after = deriveCart(patient);
      // only flip if still "sent" (use latest patient state)
      onUpdate({
        ...patient,
        cart: {
          ...(patient.cart || after),
          items: (patient.cart?.items || after.items).map(i =>
            i.id === id ? { ...i, validationState: "signed", patientValidatedAt: new Date().toISOString() } : i
          ),
        },
      });
      onPushToast?.(t("validate.signed"), "success");
    }, 1800);
  };

  // Spec v12 §1 — Verbal consent fallback. Records the consent without
  // exposing the pregnancy answer to the nurse for sensitive items (the
  // answer goes to the physician via the audit log, not the cart UI).
  const SENSITIVE_KINDS = ["imaging"];
  const SENSITIVE_IDS = ["preg-bhcg", "hiv-test", "sti-panel", "genetic-panel"];
  const isItemSensitive = (item) => !!item && (
    SENSITIVE_IDS.includes(item.id) || (SENSITIVE_KINDS.includes(item.kind) && (patient.sexAtBirth === "Female"))
  );
  const verbalItem = useMemo(() => cart.items.find(i => i.id === verbalForItemId) || null, [cart.items, verbalForItemId]);
  const saveVerbalConsent = (record) => {
    setCart({
      ...cart,
      items: cart.items.map(i => i.id === verbalForItemId
        ? { ...i, validationState: "verbal", consentBy: record.by, consentAt: record.at, supervisorOverride: record.supervisorPin ? true : undefined }
        : i),
    });
    setVerbalForItemId(null);
    onPushToast?.(`Verbal consent recorded · ${record.by}`, "success");
  };

  // === Mock insurer API decisions for insurance-paid items ===
  const insItems = cart.items.filter(i => i.payer === "insurance");
  const policyDecisions = useMemo(() => {
    const map = {};
    mockInsurerDecide(insItems).forEach(d => { map[d.id] = d; });
    return map;
  }, [insItems.map(i => i.id).join("|")]);

  // Pending validations gate
  const validationResolved = (item) => {
    const state = item.validationState || "idle";
    return state === "signed" || state === "verbal";
  };
  const pendingValidations = cart.items.filter(i => i.kind === "imaging" && !validationResolved(i));

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) { setPromoError(""); return; }
    const promo = PROMO_CODES[code];
    if (!promo) { setPromoError(t("cart.promo.notFound", { code })); return; }
    const promos = cart.promos || {};
    const collision = promoCollision(promos, code);
    if (collision) { setPromoError(collision.reason); return; }
    setPromoError("");
    setPromoInput("");
    guardPaidCartEdit(`Apply ${promo.label} to a paid visit?`, (mode) => ({
      ...cart,
      promos: { ...promos, [code]: promo },
      payment: paymentAfterPaidEdit(cart.payment, mode),
    }));
    onPushToast?.(t("cart.promo.applied", { label: promo.label }));
  };
  const removePromo = (code) => {
    const promos = { ...(cart.promos || {}) };
    delete promos[code];
    guardPaidCartEdit(`Remove promo ${code} from a paid visit?`, (mode) => ({
      ...cart,
      promos,
      payment: paymentAfterPaidEdit(cart.payment, mode),
    }));
  };

  const setCcy = (ccy) => {
    guardPaidCartEdit(`Change receipt currency to ${ccy} on a paid visit?`, (mode) => ({
      ...cart,
      ccy,
      payment: paymentAfterPaidEdit(cart.payment, mode),
    }));
  };
  const setMethod = (m) => setCart({ ...cart, payment: { ...cart.payment, method: m, status: m === "khqr" ? "waiting" : "idle" } });

  const paymentDue = paymentDueAmount(cart, totals);
  const isNoCharge = itemCount > 0 && paymentDue <= 0;
  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - paymentDue;
  const cashOk = tenderedNum >= paymentDue && paymentDue > 0;

  const confirmKhqr = () => {
    setCart({ ...cart, payment: confirmedPayment(cart, "khqr", paymentDue, cart.ccy || "USD") });
    onPushToast?.(t("cart.pay.khqrReceived"));
  };

  // === Seamless KHQR (QHA) auto-confirm via mock Bakong webhook ===
  useEffect(() => {
    if (cart.payment.method !== "khqr") return;
    if (cart.payment.status !== "waiting") return;
    const id = setTimeout(() => {
      // re-read latest cart from patient to avoid stale state
      const latest = patient.cart;
      if (!latest) return;
      if (latest.payment?.method === "khqr" && latest.payment?.status === "waiting") {
        confirmKhqr();
      }
    }, 5000);
    return () => clearTimeout(id);
  }, [cart.payment.method, cart.payment.status]);

  const confirmCash = () => {
    const tenderedInUSD = (cart.ccy || "USD") === "KHR" ? tenderedNum / KHR_RATE : tenderedNum;
    // Cash-drawer ding (Web Audio mock)
    const dinged = playDrawerDing();
    setCart({ ...cart, payment: confirmedPayment(cart, "cash", paymentDue, cart.ccy || "USD", {
      tendered,
      change: tenderedInUSD - paymentDue,
    }) });
    onPushToast?.(dinged ? t("cart.pay.drawerDing") : t("cart.pay.cashRecorded"));
  };

  const splits = (() => {
    const g = {};
    cart.items.forEach(i => { const p = i.payer || "direct"; (g[p] = g[p] || []).push(i); });
    return Object.entries(g).map(([payer, items]) => ({
      payer, items, sub: items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0),
    }));
  })();
  const isSplit = splits.length > 1;
  const payerChips = splits.map(s => ({
    label: t(PAYER_LABELS[s.payer]?.shortKey || "cart.payer.other.short"),
    color: PAYER_LABELS[s.payer]?.color || "#64748b",
    amount: s.sub,
  }));

  // === Primary CTA (Spec v12 §Order Cart) ===
  //   Single CTA: "Check in & confirm order".
  //   Strict gate (no bypass, no override) per spec:
  //     ≥1 cart item · full name · DOB · sex at birth · ≥1 verified contact.
  //   Payment is NOT a gating condition — it lives in Step 6 and can complete
  //   before or after check-in (e.g., insurance billing).
  const hasName = !!patient.name;
  const hasDob  = !!patient.dob;
  const hasSex  = !!patient.sexAtBirth;
  const isVerified = !!(patient.otpVerified || patient.telegramVerified);
  const hasPendingValidations = pendingValidations.length > 0;
  const teleInCart = cart.items.some(i => i.kind === "telecon" || i.id === "telecon");
  const tele = patient.teleconsult || {};
  const hasTeleconsultBlocker = teleInCart && !tele.booked && !tele.skipped;
  const paymentResolved = isPaid || cart.payment.status === "deferred" || isNoCharge;
  const isPaymentWaiting = cart.payment.status === "waiting";
  // Build the precise list of what's missing. This is visible above the CTA
  // because a disabled button or generic toast is not enough operationally.
  const checkInBlockers = [];
  if (!hasName) checkInBlockers.push({ id: "name", text: "Patient name is missing" });
  if (!hasDob) checkInBlockers.push({ id: "dob", text: "Date of birth is missing" });
  if (!hasSex) checkInBlockers.push({ id: "sex", text: "Sex at birth is missing" });
  if (!isVerified) checkInBlockers.push({ id: "contact", text: "Verify one contact channel" });
  if (!payerReady) checkInBlockers.push({ id: "payer", text: "Choose payer or mark direct pay" });
  if (hasPendingValidations) {
    checkInBlockers.push({
      id: "validation",
      text: `${pendingValidations.length} imaging consent ${pendingValidations.length === 1 ? "is" : "are"} unresolved`,
    });
  }
  if (hasTeleconsultBlocker) checkInBlockers.push({ id: "teleconsult", text: "Book or skip teleconsult" });
  if (!paymentResolved) {
    checkInBlockers.push({
      id: "payment",
      text: isPaymentWaiting
        ? "Payment is still waiting for confirmation"
        : "Take payment in Step 6 or mark pay-later",
    });
  }
  const ctaReasons = checkInBlockers.map(b => b.text);
  const ctaDisabled = checkInBlockers.length > 0;
  const mobileBlockers = [];
  if (!hasName || !hasDob) mobileBlockers.push("Complete identity");
  if (!isVerified) mobileBlockers.push("Verify contact");
  if (!payerReady) mobileBlockers.push("Choose payer");
  if (hasPendingValidations) mobileBlockers.push("Resolve consent");
  if (hasTeleconsultBlocker) mobileBlockers.push("Resolve teleconsult");
  if (!paymentResolved) mobileBlockers.push("Resolve payment");
  const mobileSummaryTone =
    itemCount === 0 ? "empty" :
    isCheckedIn ? "done" :
    paymentResolved ? (ctaDisabled ? "blocked" : "paid") :
    isPaymentWaiting ? "waiting" :
    ctaDisabled ? "blocked" :
    "ready";
  const mobileSummaryTitle =
    itemCount === 0 ? "Add orders" :
    isCheckedIn ? "Checked in" :
    paymentResolved ? (ctaDisabled ? "Resolve check-in" : "Ready to check in") :
    isPaymentWaiting ? "Payment in progress" :
    "Patient pays";
  const mobileSummarySub =
    itemCount === 0 ? "Search tests, services, or packages." :
    isCheckedIn ? `${patient.name || "Patient"} · ${patient.queueNumber || "checked in"}` :
    ctaDisabled ? (mobileBlockers.length ? mobileBlockers.join(" · ") : "Review required details") :
    isPaid ? (cart.payment.receiptId ? `Receipt ${cart.payment.receiptId} is ready.` : "Receipt is ready.") :
    `${itemCount} order${itemCount === 1 ? "" : "s"} ready to collect.`;

  return (
    <>
      <div className="order-cart-shell" style={{
        position: "sticky", top: "var(--gap)",
        display: "flex", flexDirection: "column", gap: "var(--gap)",
      }}>
        <div className="card order-cart" style={{ display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "calc(100vh - 100px)" }}>
          {/* === HEADER (clean) === */}
          <div className="cart-hd2">
            <div className="cart-hd2-ico"><I.ShoppingCart size={16} strokeWidth={2} /></div>
            <div className="cart-hd2-text">
              <h2 className="cart-hd2-title">{t("cart.title")}</h2>
            </div>
            <div className="cart-hd2-meta">
              <div className="cart-hd2-count">
                {itemCount > 0 && <>{itemCount} <span>{itemCount === 1 ? "item" : "items"}</span></>}
              </div>
              {removableCount > 0 && (
                <button
                  type="button"
                  className="cart-hd2-clear"
                  onClick={handleClearAll}
                  title={t("cart.clear.title")}
                  aria-label={t("cart.clear.title")}
                >
                  <I.Trash size={10} /> {t("cart.clear")}
                </button>
              )}
            </div>
          </div>
          <div className={"cart-mobile-summary cart-mobile-summary-" + mobileSummaryTone}>
            <div className="cart-mobile-summary-copy">
              <div className="cart-mobile-summary-title">{mobileSummaryTitle}</div>
              <div className="cart-mobile-summary-sub">{mobileSummarySub}</div>
            </div>
            {itemCount > 0 && (
              <div className="cart-mobile-summary-total">
                <span className="cart-mobile-summary-total-label">Total due</span>
                <span className="cart-mobile-summary-total-amount">{fmtCcy(totals.patientDue, cart.ccy)}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="cart-items-scroll">
            {itemCount === 0 ? (
              <div className="cart-empty">
                <I.ShoppingCart size={22} className="cart-empty-ico" />
                <div className="cart-empty-title">{t("cart.empty.title")}</div>
                <div className="cart-empty-sub">{t("cart.empty.addSub")}</div>
                {onOpenAdd && (
                  <button type="button" className="btn btn-secondary btn-sm cart-empty-action" onClick={onOpenAdd}>
                    <I.Plus size={12} /> {t("cart.empty.addFirst")}
                  </button>
                )}
              </div>
            ) : KIND_ORDER.map(kind => {
              const items = grouped[kind];
              if (!items || items.length === 0) return null;
              const meta = KIND_META[kind];
              const groupSub = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
              const isCollapsed = collapsedKinds.has(kind);
              return (
                <div key={kind} className={"cart-group" + (isCollapsed ? " is-collapsed" : "")}>
                  <button
                    type="button"
                    className="cart-group-head"
                    onClick={() => toggleKindCollapsed(kind)}
                    aria-expanded={!isCollapsed}
                    aria-controls={`cart-group-body-${kind}`}
                    title={isCollapsed ? t("cart.group.expand") : t("cart.group.collapse")}
                    style={{ "--group-color": meta.color }}
                  >
                    <I.ChevronDown
                      size={11}
                      strokeWidth={2.25}
                      className={"cart-group-chev" + (isCollapsed ? " is-collapsed" : "")}
                    />
                    <span className="cart-group-label">
                      {t(meta.labelKey)}
                    </span>
                    <span className="cart-group-count">{items.length}</span>
                    <span className="cart-group-sub">{fmtCcy(groupSub, cart.ccy || "USD")}</span>
                  </button>
                  {!isCollapsed && (
                    <div id={`cart-group-body-${kind}`} className="cart-group-body">
                      {items.map((item, idx) => (
                        <CartLine
                          key={item.id}
                          item={{ ...item, onVerbalConsent: () => setVerbalForItemId(item.id) }}
                          isLast={idx === items.length - 1}
                          ccy={cart.ccy || "USD"}
                          onRemove={() => removeItem(item.id)}
                          onSendValidation={() => sendValidation(item.id)}
                          policyDecision={policyDecisions[item.id]}
                          coverage={getCoverage(item.id, patient.insurance || [])}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* v9 §3 — Hide promo / totals / split / payment / TAT entirely when
             cart is empty. Receptionist isn't distracted by a $0.00 row.
             Reappears as soon as the first item lands in the cart. */}
          {itemCount > 0 && (<>
          {/* Billing summary — collapsed by default to give items more room */}
          <div className="cart-billing-summary" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
            {/* Always-visible: Patient pays total + expand toggle */}
            <button
              type="button"
              onClick={() => setBillExpanded(o => !o)}
              className="cart-total-toggle"
            >
              <span className="cart-total-label">
                <span>{t("cart.patientPays")}</span>
                {totals.insCoverage > 0 && (
                  <small>Insurance pays {fmtCcy(totals.insCoverage, cart.ccy)}</small>
                )}
              </span>
              <span className="cart-total-amount">
                {fmtCcy(totals.patientDue, cart.ccy)}
              </span>
              <I.ChevronDown
                size={13}
                strokeWidth={2.25}
                className="cart-total-chev"
                style={{
                  transform: billExpanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {/* Applied promo chips — always visible so nurses know what's active */}
            {Object.keys(cart.promos || {}).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 16px 8px" }}>
                {Object.entries(cart.promos).map(([code, p]) => (
                  <div key={code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: 5, background: "var(--success-50)", border: "1px solid var(--success-200, #a7f3d0)" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, minWidth: 0 }}>
                      <I.Tag size={11} style={{ color: "var(--success-600, #059669)", flexShrink: 0 }} />
                      <strong style={{ color: "var(--success-700, #047857)", fontFamily: "'SF Mono', ui-monospace, monospace" }}>{code}</strong>
                      <span style={{ color: "var(--ink-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {p.label}</span>
                    </div>
                    <button onClick={() => removePromo(code)} style={{ background: "transparent", border: "none", padding: 2, cursor: "pointer", color: "var(--ink-400)", display: "grid", placeItems: "center", flexShrink: 0 }} title={t("cart.promo.remove")}>
                      <I.X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded: full breakdown + promo input + split */}
            {billExpanded && (
              <div style={{ padding: "0 16px 10px", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, paddingTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-600)" }}>
                    <span>{t("cart.subtotal")}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCcy(totals.subtotal, cart.ccy)}</span>
                  </div>
                  {totals.breakdown.map(b => (
                    <div key={b.code} style={{ display: "flex", justifyContent: "space-between", color: "var(--success-700, #047857)", fontSize: 11 }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{b.code}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmtCcy(b.amount, cart.ccy)}</span>
                    </div>
                  ))}
                  {totals.insTotalRaw > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-500)", fontSize: 11 }}>
                      <span>{t("cart.insCovers")}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmtCcy(totals.insCoverage, cart.ccy)}</span>
                    </div>
                  )}
                  {totals.corpTotal > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-500)", fontSize: 11 }}>
                      <span>{t("cart.corpCovers")}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>−{fmtCcy(totals.corpTotal, cart.ccy)}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <I.Tag size={11} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)" }} />
                      <input className="input" value={promoInput}
                        onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                        placeholder={Object.keys(cart.promos || {}).length > 0 ? t("cart.promo.addAnother") : t("cart.promo.placeholder")}
                        style={{ height: 28, fontSize: 11.5, padding: "0 8px 0 26px", textTransform: "uppercase", borderColor: promoError ? "var(--danger-500)" : undefined }}
                        onKeyDown={e => { if (e.key === "Enter") applyPromo(); }} />
                    </div>
                    <button type="button" onClick={applyPromo} disabled={!promoInput.trim()}
                      style={{
                        height: 28, padding: "0 10px",
                        border: "1px solid var(--border-strong)",
                        background: promoInput.trim() ? "var(--brand-50)" : "var(--surface-2)",
                        color: promoInput.trim() ? "var(--brand-700)" : "var(--ink-400)",
                        borderRadius: 5, fontSize: 11.5, fontWeight: 650,
                        cursor: promoInput.trim() ? "pointer" : "not-allowed",
                      }}>{t("cart.promo.apply")}</button>
                  </div>
                  {promoError ? (
                    <div style={{ fontSize: 10.5, color: "var(--danger-500)", marginTop: 3, display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <I.AlertCircle size={10} /> {promoError}
                    </div>
                  ) : Object.keys(cart.promos || {}).length === 0 && (
                    <div style={{ fontSize: 10, color: "var(--ink-400)", marginTop: 3 }}>{t("cart.promo.hint")}</div>
                  )}
                </div>

                {payerChips.length > 1 && (
                  <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 5, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 10.5, color: "var(--ink-500)", fontWeight: 600, marginRight: 4 }}>{t("cart.split.label")}</span>
                    {payerChips.map((c, i) => (
                      <span key={i} style={{
                        fontSize: 10.5, fontWeight: 600, color: c.color,
                        background: c.color + "15",
                        padding: "1px 5px", borderRadius: 3,
                        fontVariantNumeric: "tabular-nums",
                      }}>{c.label} {fmtCcy(c.amount, cart.ccy)}</span>
                    ))}
                  </div>
                )}

                <button className="btn btn-ghost" onClick={() => setSplitOpen(true)}
                  style={{ width: "100%", marginTop: 8, height: 28, fontSize: 11.5, fontWeight: 600, color: "var(--ink-700)" }}
                  disabled={itemCount === 0}>
                  <I.Split size={12} /> {isSplit ? t("cart.split.edit") : t("cart.split.bill")}
                </button>
              </div>
            )}
          </div>

          {/* === Auto-split hint (when insurance is in the mix) === */}
          {insItems.length > 0 && cart.payment.status !== "confirmed" && (
            <div style={{
              padding: "8px 16px", borderTop: "1px solid var(--border)",
              background: "var(--brand-50)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <I.Sparkles size={13} style={{ color: "var(--brand-600)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 650, color: "var(--brand-700)" }}>{t("ins.autoSplit")}</div>
                <div style={{ fontSize: 10, color: "var(--ink-600)", marginTop: 1 }}>
                  {t("ins.autoSplit.sub", { covered: 80, patient: 20 })}
                </div>
              </div>
            </div>
          )}

          {/* Spec v12: payment moved out of the cart into Step 6.
             The cart only renders PaymentArea when the wizard is on Step 6
             AND the cart is mounted as the desktop sticky rail (not the
             mobile sheet — mobile sheet has its own Pay tab that mounts
             Step6Payment directly). For now Step 6 owns its own payment
             surface, so the cart never mounts PaymentArea. */}
          </>)}

          {/* Spec v12 §Order Cart — single "Check in & confirm order" CTA.
             Strict gate (no bypass): identity, payer, consent, teleconsult,
             and payment blockers are listed visibly before the CTA. */}
          {itemCount > 0 && !isCheckedIn && (
            <div className="cart-primary-cta-wrap" style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--border)" }}>
              {!paymentResolved && !isPaymentWaiting && currentStep >= 6 && !ctaDisabled && (
                <div className="cart-pending-flags" role="status" aria-live="polite">
                  <span className="cart-pending-flag cart-pending-flag-pay">
                    <I.CreditCard size={10} /> {t("cart.flag.paymentPending") || "Payment pending — collect in Step 6"}
                  </span>
                </div>
              )}
              {checkInBlockers.length > 0 && !blankState && (
                <div className="cart-checkin-blockers" role="status" aria-live="polite">
                  <div className="cart-checkin-blockers-head">
                    <I.ClipboardList size={12} />
                    <span>Still needed</span>
                  </div>
                  <ul>
                    {checkInBlockers.map(blocker => (
                      <li key={blocker.id}>{blocker.text}</li>
                    ))}
                  </ul>
                </div>
              )}
              {isPaymentWaiting && (
                <div className="cart-pending-flags">
                  <span className="cart-pending-flag cart-pending-flag-waiting">
                    <I.Clock size={10} /> {t("cart.cta.waitingPayment")}
                  </span>
                </div>
              )}
              <DisabledTooltip
                block
                disabled={ctaDisabled}
                title={t("disabled.checkin.title")}
                reasons={ctaReasons}
                hint={t("disabled.checkin.hint")}
              >
                <button
                  className="btn btn-primary cart-primary-cta cart-primary-cta-checkin"
                  onClick={onCheckIn}
                  disabled={ctaDisabled}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <I.Check size={15} /> {t("cart.cta.checkInConfirm") || "Check in & confirm order"}
                </button>
              </DisabledTooltip>
            </div>
          )}
          {itemCount > 0 && isCheckedIn && (
            <div className="cart-primary-cta-wrap" style={{ padding: "10px 16px 14px", borderTop: "1px solid var(--border)" }}>
              <div className="cart-checkin-done">
                <I.CheckCircle size={18} />
                <span>Patient checked in</span>
              </div>
            </div>
          )}

          {/* v9 §2 — Results Turnaround is pinned inside the cart, below the CTA.
             Lives in the fixed footer zone — never scrolls with cart items.
             Only visible when cart has items (per v9 §3). */}
          {itemCount > 0 && cart.payment.status !== "confirmed" && (
            <div className="cart-tat-footer">
              <TatCompact patient={patient} embedded />
            </div>
          )}
        </div>
      </div>

      <BillSplitModal
        open={splitOpen}
        cart={cart}
        onClose={() => setSplitOpen(false)}
        onSave={(next) => {
          guardPaidCartEdit("Change payer split on a paid visit?", (mode) => ({
            ...next,
            payment: paymentAfterPaidEdit(cart.payment, mode),
          }));
          setSplitOpen(false);
          onPushToast?.(t("cart.split.applied"));
        }}
      />
      <PregnancyConsentModal open={pregOpen} patient={patient} pendingItems={pendingPregItems || []} onConfirm={handlePregConsent} onCancel={handlePregCancel} />
      <VerbalConsentModal
        open={!!verbalItem}
        item={verbalItem}
        isSensitive={isItemSensitive(verbalItem)}
        onConfirm={saveVerbalConsent}
        onCancel={() => setVerbalForItemId(null)}
      />
    </>
  );
}
