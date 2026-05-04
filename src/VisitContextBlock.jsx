import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { I } from "./icons";

function clinicalList(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function Popover({ anchorRef, onClose, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const maxW = 320;
    const left = Math.min(window.innerWidth - maxW - 8, Math.max(8, r.left));
    setPos({ top: r.bottom + 6, left });
  }, [anchorRef]);

  useEffect(() => {
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose();
    };
    const onKey = e => { if (e.key === "Escape") onClose(); };
    const onMove = () => onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [anchorRef, onClose]);

  if (!pos) return null;
  return (
    <div
      ref={ref}
      className="visit-context-pop"
      role="dialog"
      style={{ position: "fixed", top: pos.top, left: pos.left }}
    >
      {children}
    </div>
  );
}

function ChipGroup({ items, variant, inline = 2 }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  if (!items.length) return null;
  const visible = items.slice(0, inline);
  const hidden = items.slice(inline);
  const chipCls = "visit-context-chip" + (variant === "rx" ? " visit-context-chip-rx" : "");
  return (
    <div className="visit-context-chips">
      {visible.map((it, i) => (
        <span key={i} className={chipCls} title={it}>{it}</span>
      ))}
      {hidden.length > 0 && (
        <>
          <button
            ref={btnRef}
            type="button"
            className="visit-context-chip visit-context-chip-more"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label={`Show ${hidden.length} more`}
          >+{hidden.length}</button>
          {open && (
            <Popover anchorRef={btnRef} onClose={() => setOpen(false)}>
              <div className="visit-context-pop-chips">
                {hidden.map((it, i) => (
                  <span key={i} className={chipCls}>{it}</span>
                ))}
              </div>
            </Popover>
          )}
        </>
      )}
    </div>
  );
}

function ValueWithMore({ text }) {
  const ref = useRef(null);
  const btnRef = useRef(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
  }, [text]);

  return (
    <div className="visit-context-value-wrap">
      <span ref={ref} className="visit-context-value" title={text}>{text}</span>
      {truncated && (
        <>
          <button
            ref={btnRef}
            type="button"
            className="visit-context-more-btn"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
          >more</button>
          {open && (
            <Popover anchorRef={btnRef} onClose={() => setOpen(false)}>
              <div className="visit-context-pop-text">{text}</div>
            </Popover>
          )}
        </>
      )}
    </div>
  );
}

export function VisitContextBlock({ patient, className = "" }) {
  const details = patient.visitDetails || {};
  const chiefComplaint = (details.chiefComplaint || "").trim();
  const history = clinicalList(details.medicalHistory);
  const medications = clinicalList(details.medications);
  if (!chiefComplaint && history.length === 0 && medications.length === 0) return null;

  return (
    <section className={"visit-context-strip" + (className ? " " + className : "")} aria-label="Visit context">
      <div className="visit-context-kicker">
        <I.ClipboardList size={13} />
        <span>Visit context</span>
      </div>
      <div className="visit-context-list">
        {chiefComplaint && (
          <div className="visit-context-item">
            <span className="visit-context-label">Chief complaint</span>
            <ValueWithMore text={chiefComplaint} />
          </div>
        )}
        {history.length > 0 && (
          <div className="visit-context-item">
            <span className="visit-context-label">History</span>
            <ChipGroup items={history} />
          </div>
        )}
        {medications.length > 0 && (
          <div className="visit-context-item">
            <span className="visit-context-label">Medications</span>
            <ChipGroup items={medications} variant="rx" />
          </div>
        )}
      </div>
    </section>
  );
}
