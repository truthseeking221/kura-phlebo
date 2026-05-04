// Shared scan-gate entry. Both Vital Signs and Phlebotomy land here when no
// patient is loaded. Autofocus is the operator's expectation — barcode
// scanners type into the focused field then send Enter.

import { useState, useRef, useEffect } from "react";
import { I } from "./icons";

const PID_RE = /^P\d{4,8}$/i;

export function ScanGate({ role, queue, onMatch, onBrowseQueue, browseOpen }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Refocus on tab return — scanner-driven workflow expects the field hot.
  useEffect(() => {
    const refocus = () => {
      if (document.activeElement === document.body) inputRef.current?.focus();
    };
    window.addEventListener("focus", refocus);
    return () => window.removeEventListener("focus", refocus);
  }, []);

  const tryLookup = (raw) => {
    const pid = (raw || value).trim().toUpperCase();
    if (!pid) return;
    const match = queue.find(p => p.pid.toUpperCase() === pid);
    if (match) {
      setError(null);
      onMatch?.(match);
      setValue("");
    } else {
      setError(`No patient for "${pid}". Try again.`);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      inputRef.current?.select();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      tryLookup();
    }
  };

  const valid = !value || PID_RE.test(value.trim());

  const accentClass = role === "Phlebotomy" ? "vp-accent-phlebo" : "vp-accent-vitals";

  return (
    <div className={"vp-scan-gate " + accentClass}>
      <div className="vp-scan-card">
        <div className="vp-scan-glyph" aria-hidden="true">
          {role === "Phlebotomy" ? <I.FlaskConical size={36} /> : <I.Heart size={36} />}
        </div>
        <h1 className="vp-scan-title">Scan patient barcode</h1>
        <div className="vp-scan-sub">
          Hand-scan the printed bill or type the Patient ID.
        </div>

        <div className={"vp-scan-input-wrap" + (shake ? " is-shake" : "") + (error ? " is-error" : "")}>
          <I.Scan size={18} />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
            onKeyDown={onKeyDown}
            placeholder="P __ __ __ __ __ __"
            aria-label="Patient ID"
            inputMode="text"
            autoCapitalize="characters"
            spellCheck={false}
          />
          {value && (
            <button
              type="button"
              className="vp-scan-clear"
              onClick={() => { setValue(""); setError(null); inputRef.current?.focus(); }}
              aria-label="Clear"
            >
              <I.X size={14} />
            </button>
          )}
        </div>

        {!valid && !error && (
          <div className="vp-scan-hint">Format looks off — expected e.g. P123456</div>
        )}
        {error && (
          <div className="vp-scan-error" role="alert">
            <I.AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="vp-scan-divider"><span>or</span></div>

        <button type="button" className="vp-scan-browse" onClick={onBrowseQueue} aria-expanded={browseOpen}>
          <I.Users size={15} />
          <span>Browse queue</span>
          <span className="vp-scan-browse-count">{queue.length}</span>
          <I.ChevronDown size={14} style={{ transform: browseOpen ? "rotate(180deg)" : "" }} />
        </button>

        {browseOpen && (
          <div className="vp-scan-queue-list">
            {queue.map(p => (
              <button
                key={p.id}
                type="button"
                className="vp-scan-queue-row"
                onClick={() => onMatch?.(p)}
              >
                <div className={"avatar av-sm " + (p.avatarColor || "av-blue")}>{p.initials}</div>
                <div className="vp-scan-queue-main">
                  <div className="vp-scan-queue-name">{p.name}</div>
                  <div className="vp-scan-queue-meta">
                    <span>{p.pid}</span>
                    <span>·</span>
                    <span>{p.checkInAt}</span>
                    <span>·</span>
                    <span className={p.waitingMinutes > 60 ? "vp-wait-danger" : p.waitingMinutes > 30 ? "vp-wait-warn" : ""}>
                      {p.waitingMinutes} min
                    </span>
                  </div>
                </div>
                <I.ChevronRight size={14} />
              </button>
            ))}
          </div>
        )}

        <div className="vp-scan-tips">
          <kbd>Enter</kbd> submit · <kbd>Esc</kbd> clear · scanner sends both for you
        </div>
      </div>
    </div>
  );
}
