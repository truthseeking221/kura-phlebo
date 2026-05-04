// Right-side queue drawer. Click a row to load that patient (same effect as
// scanning their barcode). Useful as a fallback when the scanner misbehaves
// and as the operator's at-a-glance view of the booth's waiting list.

import { useMemo } from "react";
import { I } from "./icons";

function statusFor(p, role) {
  // Translate the journey state into a single-step pill from the booth's
  // perspective.
  const target = role === "Phlebotomy" ? p.journey?.phlebo : p.journey?.vitals;
  if (target === "done")    return { tone: "success", label: "Done" };
  if (target === "pending") return { tone: "info",    label: "In progress" };
  return { tone: "muted", label: "Waiting" };
}

export function QueueDrawer({ open, onClose, queue, role, onPick }) {
  const rows = useMemo(() => {
    return queue.slice().sort((a, b) => b.waitingMinutes - a.waitingMinutes);
  }, [queue]);

  return (
    <>
      <div className={"vp-queue-scrim" + (open ? " is-open" : "")} onClick={onClose} aria-hidden={!open} />
      <aside className={"vp-queue-drawer" + (open ? " is-open" : "")} aria-label="Queue" aria-hidden={!open}>
        <header className="vp-queue-head">
          <div>
            <span className="vp-queue-eyebrow">{role}</span>
            <h3 className="vp-queue-title">Queue · {queue.length} waiting</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <I.X size={16} />
          </button>
        </header>

        <div className="vp-queue-list">
          {rows.map(p => {
            const st = statusFor(p, role);
            const wait = p.waitingMinutes;
            const tone =
              wait > 60 ? "danger" :
              wait > 30 ? "warn"   : null;
            return (
              <button key={p.id} type="button" className="vp-queue-row" onClick={() => { onPick(p); onClose(); }}>
                <div className={"avatar av-md " + (p.avatarColor || "av-blue")}>{p.initials}</div>
                <div className="vp-queue-row-main">
                  <div className="vp-queue-row-name">
                    <span>{p.name}</span>
                    {tone && <span className={"vp-queue-alert vp-tone-" + tone}><I.AlertTriangle size={10} /></span>}
                  </div>
                  <div className="vp-queue-row-meta">
                    <span className="vp-queue-pid">{p.pid}</span>
                    <span>·</span>
                    <span>{p.checkInAt}</span>
                    <span>·</span>
                    <span className={tone ? "vp-tone-" + tone : ""}>{wait} min</span>
                  </div>
                </div>
                <span className={"vp-pill vp-tone-" + st.tone}>{st.label}</span>
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className="vp-queue-empty">
              <I.CheckCircle size={20} />
              <span>Queue is clear.</span>
            </div>
          )}
        </div>

        <footer className="vp-queue-foot">
          <span className="vp-queue-foot-hint">
            Click a row to load — same as scanning the barcode.
          </span>
        </footer>
      </aside>
    </>
  );
}
