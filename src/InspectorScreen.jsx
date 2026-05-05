// InspectorScreen — cross-queue tube barcode lookup with full SampleDetailPanel.
// Operator scans any tube ID to inspect spec, status, and take collection actions.

import { useState, useEffect, useRef, useMemo } from "react";
import { I } from "./icons";
import { SampleDetailPanel } from "./SampleDetailPanel";
import { tubeByKey } from "./phleboData";

export function InspectorScreen({ queue, onUpdateSamples, onPushToast }) {
  const [query, setQuery] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(null);
  const [foundSample, setFoundSample] = useState(null);
  const [foundPatient, setFoundPatient] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Refocus on tab return — scanner-driven workflow
  useEffect(() => {
    const refocus = () => {
      if (document.activeElement === document.body) inputRef.current?.focus();
    };
    window.addEventListener("focus", refocus);
    return () => window.removeEventListener("focus", refocus);
  }, []);

  // Flatten queue → list of all samples with patient ref for quick-pick + suffix match
  const allSamples = useMemo(() => {
    const out = [];
    for (const patient of queue) {
      for (const s of patient.samples || []) {
        out.push({ patient, sample: s });
      }
    }
    return out;
  }, [queue]);

  function search(raw) {
    const val = (raw || "").trim();
    if (!val) return;
    setError(null);
    // 1. Exact match on full sample ID
    let hit = allSamples.find((it) => it.sample.id === val);
    // 2. Suffix match (last 6+ digits typed)
    if (!hit && /^\d{4,}$/.test(val)) {
      hit = allSamples.find((it) => it.sample.id.endsWith(val));
    }
    // 3. Substring fallback for partial typing
    if (!hit && val.length >= 4) {
      hit = allSamples.find((it) => it.sample.id.includes(val));
    }
    if (hit) {
      setFoundSample(hit.sample);
      setFoundPatient(hit.patient);
      setQuery("");
      return;
    }
    setError(`No sample matches "${val}".`);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    inputRef.current?.select();
  }

  function pickFromQueue(it) {
    setFoundSample(it.sample);
    setFoundPatient(it.patient);
    setQuery("");
    setError(null);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      search(query);
    } else if (e.key === "Escape") {
      setQuery("");
      setError(null);
    }
  }

  function clearResult() {
    setFoundSample(null);
    setFoundPatient(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleCollect(id) {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = foundPatient.samples.map((s) =>
      s.id === id ? { ...s, status: "collected", collectedAt: timeStr, collectedAtMs: now } : s
    );
    onUpdateSamples(foundPatient.id, updated);
    const next = updated.find((s) => s.id === id);
    setFoundSample(next);
    setFoundPatient({ ...foundPatient, samples: updated });
    onPushToast?.({ tone: "success", text: `Sample ${id.slice(-6)} marked collected.` });
  }

  function handleReset(id) {
    const updated = foundPatient.samples.map((s) =>
      s.id === id
        ? { ...s, status: "generated", collectedAt: null, collectedAtMs: null, inverted: false, deferReason: null }
        : s
    );
    onUpdateSamples(foundPatient.id, updated);
    const next = updated.find((s) => s.id === id);
    setFoundSample(next);
    setFoundPatient({ ...foundPatient, samples: updated });
    onPushToast?.({ tone: "info", text: `Sample ${id.slice(-6)} reset.` });
  }

  function handleMarkInverted(id) {
    const updated = foundPatient.samples.map((s) =>
      s.id === id ? { ...s, inverted: true } : s
    );
    onUpdateSamples(foundPatient.id, updated);
    const next = updated.find((s) => s.id === id);
    setFoundSample(next);
    setFoundPatient({ ...foundPatient, samples: updated });
    onPushToast?.({ tone: "success", text: `Sample ${id.slice(-6)} marked inverted.` });
  }

  function handlePickAnother(id) {
    if (id == null) {
      clearResult();
      return;
    }
    const next = foundPatient.samples.find((s) => s.id === id);
    if (next) setFoundSample(next);
  }

  if (foundSample && foundPatient) {
    return (
      <section className="vp-inspector-screen vp-inspector-screen-found">
        <div className="vp-inspector-patient-ctx">
          <div className={`avatar ${foundPatient.avatarColor}`}>{foundPatient.initials}</div>
          <div>
            <div className="vp-inspector-patient-name">{foundPatient.name}</div>
            <div className="vp-inspector-patient-sub">
              {foundPatient.pid} · Order {foundPatient.orderId}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={clearResult}>
            <I.RefreshCw size={13} /> Scan another
          </button>
        </div>
        <SampleDetailPanel
          sample={foundSample}
          allSamples={foundPatient.samples}
          onMarkInverted={handleMarkInverted}
          onCollect={handleCollect}
          onReset={handleReset}
          onPickAnother={handlePickAnother}
        />
      </section>
    );
  }

  return (
    <section className="vp-inspector-screen">
      <div className="vp-inspector-scan-wrap">
        <div className="vp-inspector-glyph">
          <I.Scan size={26} />
        </div>
        <div className="vp-inspector-title">Tube Inspector</div>
        <div className="vp-inspector-sub">
          Scan any tube barcode to inspect its spec, status, and handling instructions.
        </div>
        <div className={"vp-scan-input-wrap" + (shake ? " is-shake" : "") + (error ? " is-error" : "")}>
          <I.Scan size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Scan or type sample ID…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (error) setError(null); }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
          {query && (
            <button
              type="button"
              className="vp-scan-clear"
              onClick={() => { setQuery(""); setError(null); inputRef.current?.focus(); }}
              aria-label="Clear"
            >
              <I.X size={14} />
            </button>
          )}
        </div>
        {error && (
          <div className="vp-scan-error" role="alert">
            <I.AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="vp-inspector-hint">
          <kbd>Enter</kbd> submit · <kbd>Esc</kbd> clear · scanner sends Enter automatically
        </div>

        {allSamples.length > 0 && (
          <div className="vp-inspector-pick">
            <div className="vp-inspector-pick-label">Or pick from queue · {allSamples.length} samples</div>
            <div className="vp-inspector-pick-list">
              {allSamples.slice(0, 8).map((it) => {
                const t = tubeByKey(it.sample.tube);
                return (
                  <button
                    key={it.sample.id}
                    type="button"
                    className="vp-inspector-pick-row"
                    onClick={() => pickFromQueue(it)}
                  >
                    <span className="vp-inspector-pick-dot" style={{ background: t.color, borderColor: t.stripeColor }} />
                    <span className="vp-inspector-pick-tube">{t.short}</span>
                    <span className="vp-inspector-pick-id">{it.sample.id.slice(-6)}</span>
                    <span className="vp-inspector-pick-pt">{it.patient.name}</span>
                    <I.ChevronRight size={13} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
