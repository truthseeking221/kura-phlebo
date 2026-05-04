// === Modals + Toasts ===
import React, { useState, useEffect, useRef } from "react";
import { I } from "./icons";
import { Kbd, MOD_LABEL } from "./shared";
import { useLang } from "./i18n";

export function AddServiceModal({ open, onClose, onAdd }) {
  const t = useLang();
  const catalog = [
    { cat: "Blood",   items: [{ name: "CBC", price: 6 }, { name: "Glucose Fasting", price: 3 }, { name: "HbA1c", price: 8 }, { name: "Lipid Panel", price: 12 }, { name: "TSH", price: 9 }] },
    { cat: "Imaging", items: [{ name: "X-ray Chest", price: 15 }, { name: "X-ray Lumbar", price: 18 }, { name: "Ultrasound Abdomen", price: 32 }] },
    { cat: "Vitals",  items: [{ name: "ECG", price: 22 }, { name: "Vitamin D", price: 25 }, { name: "Blood Pressure", price: 0 }, { name: "Vision Test", price: 0 }] },
  ];
  const [q, setQ] = useState("");
  const [picks, setPicks] = useState([]);
  useEffect(() => { if (open) { setQ(""); setPicks([]); } }, [open]);
  if (!open) return null;
  const flat = catalog.flatMap(c => c.items.map(it => ({ ...it, cat: c.cat })))
    .filter(it => it.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (it) => {
    setPicks(p => p.find(x => x.name === it.name) ? p.filter(x => x.name !== it.name) : [...p, { ...it }]);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 600 }}>
        <div className="modal-head">
          <div className="between">
            <div>
              <h2>{t("modal.addService.title")}</h2>
              <p>{t("modal.addService.sub")}</p>
            </div>
            <button className="icon-btn" onClick={onClose} style={{ width: 30, height: 30 }}><I.X size={14} /></button>
          </div>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)" }}>
            <div className="search" style={{ height: 38 }}>
              <I.Search size={15} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("modal.addService.search")} />
            </div>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto", padding: "4px 12px 12px" }}>
            {flat.length === 0 ? (
              <div className="empty"><div className="empty-ico"><I.Search size={20} /></div><h3>{t("modal.addService.noMatch")}</h3><p>{t("modal.addService.noMatchSub")}</p></div>
            ) : flat.map((it, i) => {
              const picked = picks.find(p => p.name === it.name);
              return (
                <div key={i} onClick={() => toggle(it)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 7, cursor: "pointer", background: picked ? "var(--brand-50)" : "transparent" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid " + (picked ? "var(--brand-500)" : "var(--ink-300)"), background: picked ? "var(--brand-500)" : "white", display: "grid", placeItems: "center", color: "white" }}>
                    {picked && <I.Check size={11} strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>{it.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{it.cat}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--ink-800)" }}>${it.price.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-foot">
          <span style={{ fontSize: 12.5, color: "var(--ink-500)", marginRight: "auto" }}>{picks.length} {t("modal.addService.selected")}</span>
          <button className="btn btn-ghost" onClick={onClose}>{t("modal.cancel")}</button>
          <button className="btn btn-primary" disabled={picks.length === 0} onClick={() => onAdd(picks)}>
            <I.Plus size={15} /> {t("modal.addService.cta")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmConsentModal({ open, onClose, onConfirm, patient }) {
  const t = useLang();
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
        <div className="modal-head">
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--warn-50)", color: "var(--warn-600)", display: "grid", placeItems: "center" }}>
              <I.AlertTriangle size={18} />
            </span>
            {t("modal.consent.title")}
          </h2>
          <p>{patient?.name} {t("modal.consent.body")}</p>
        </div>
        <div className="modal-body">
          <div style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5, color: "var(--ink-700)", lineHeight: 1.5 }}>
            {t("modal.consent.notice")}
          </div>
          <label className="row" style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-700)" }}>
            <input type="checkbox" /> {t("modal.consent.checkbox")}
          </label>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>{t("modal.cancel")}</button>
          <button className="btn btn-primary" onClick={onConfirm}>
            <I.Check size={15} /> {t("modal.consent.cta")}
          </button>
        </div>
      </div>
    </div>
  );
}

// === HotkeyCheatsheetModal ===
// Press "?" anywhere (when not typing) to open. Lists every shortcut grouped
// by layer (Anywhere / Inside Add Test). Esc closes.
export function HotkeyCheatsheetModal({ open, onClose }) {
  const t = useLang();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const Row = ({ keys, label }) => (
    <div className="cheatsheet-row">
      <div className="cheatsheet-keys">
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            {k === "+" ? <span className="cheatsheet-plus">+</span> : <Kbd>{k}</Kbd>}
          </React.Fragment>
        ))}
      </div>
      <div className="cheatsheet-label">{label}</div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560, padding: 0 }} role="dialog" aria-modal="true" aria-label={t("hotkey.cheatsheet.title")}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <I.KeyRound size={16} /> {t("hotkey.cheatsheet.title")}
            </h3>
            <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>{t("hotkey.cheatsheet.sub")}</div>
          </div>
          <button onClick={onClose} className="icon-btn"><I.X size={16} /></button>
        </div>
        <div style={{ padding: "16px 20px", maxHeight: "70vh", overflowY: "auto" }}>
          <div className="cheatsheet-section-title">{t("hotkey.section.global")}</div>
          <Row keys={["T"]} label={t("hotkey.action.openAdd")} />
          <Row keys={["Alt", "+", "T"]} label={t("hotkey.action.openAddAlt")} />
          <Row keys={[MOD_LABEL, "+", "K"]} label={t("hotkey.action.focusSearch")} />
          <Row keys={["Ctrl", "+", "N"]} label={t("hotkey.action.newWalkin")} />
          <Row keys={["?"]} label={t("hotkey.action.cheatsheet")} />
          <Row keys={["Esc"]} label={t("hotkey.action.closeModal")} />

          <div className="cheatsheet-section-title" style={{ marginTop: 18 }}>{t("hotkey.section.modal")}</div>
          <Row keys={["↑", "↓"]} label={t("hotkey.action.navigate")} />
          <Row keys={["Space"]} label={t("hotkey.action.toggleSelect")} />
          <Row keys={["↵"]} label={t("hotkey.action.commit")} />
          <Row keys={["⇧", "+", "↵"]} label={t("hotkey.action.markNext")} />
          <Row keys={["1", "–", "6"]} label={t("hotkey.action.tab")} />
          <Row keys={[MOD_LABEL, "+", "A"]} label={t("hotkey.action.selectAll")} />
          <Row keys={["/"]} label={t("hotkey.action.focusModalSearch")} />
        </div>
        <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 11.5, color: "var(--ink-500)" }}>
            {t("hotkey.cheatsheet.foot")}
          </div>
          <button className="btn btn-ghost" onClick={onClose}>{t("modal.cancel")} <Kbd>Esc</Kbd></button>
        </div>
      </div>
    </div>
  );
}

// Exit animation duration — must stay in sync with `--toast-exit-ms` in styles.css.
const TOAST_EXIT_MS = 240;

export function ToastStack({ toasts, onClose }) {
  // Local mirror of `toasts` so a removed toast can play its exit animation
  // before unmounting. Each item carries a `leaving` flag.
  const [items, setItems] = useState([]);
  const exitTimers = useRef(new Map());

  // Diff incoming `toasts` against local items: append new ones, mark missing
  // ones as `leaving` (kept in DOM until the exit animation finishes).
  useEffect(() => {
    const incomingIds = new Set(toasts.map(t => t.id));
    setItems(prev => {
      const seen = new Set();
      let changed = false;
      const next = prev.map(it => {
        seen.add(it.id);
        if (!incomingIds.has(it.id) && !it.leaving) {
          changed = true;
          return { ...it, leaving: true };
        }
        return it;
      });
      for (const t of toasts) {
        if (!seen.has(t.id)) {
          next.push({ ...t, leaving: false });
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [toasts]);

  // Schedule the actual unmount once a toast is marked leaving.
  useEffect(() => {
    items.forEach(it => {
      if (it.leaving && !exitTimers.current.has(it.id)) {
        const tid = setTimeout(() => {
          setItems(curr => curr.filter(x => x.id !== it.id));
          exitTimers.current.delete(it.id);
        }, TOAST_EXIT_MS);
        exitTimers.current.set(it.id, tid);
      }
    });
  }, [items]);

  useEffect(() => () => {
    exitTimers.current.forEach(t => clearTimeout(t));
    exitTimers.current.clear();
  }, []);

  return (
    <div className="toast-stack">
      {items.map(t => (
        <div key={t.id} className={"toast-row" + (t.leaving ? " is-leaving" : "")}>
          <div className={"toast " + (t.tone || "success")} role="status">
            <span className="t-ico-wrap">
              {t.tone === "error"
                ? <I.AlertCircle size={15} className="t-ico" strokeWidth={2.4} />
                : <I.Check size={15} className="t-ico" strokeWidth={3} />}
            </span>
            <span className="t-text">{t.text}</span>
            {t.actionLabel && t.onAction && (
              <button
                type="button"
                className="t-action"
                onClick={() => {
                  t.onAction();
                  onClose(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              className="t-close"
              onClick={() => onClose(t.id)}
              aria-label="Dismiss"
            >
              <I.X size={13} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
