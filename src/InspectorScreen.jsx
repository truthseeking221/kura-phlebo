// InspectorScreen — cross-queue tube barcode lookup with full SampleDetailPanel.
// Operator scans any tube ID to inspect spec, status, and take collection actions.

import { useState, useEffect, useRef } from "react";
import { I } from "./icons";
import { SampleDetailPanel } from "./SampleDetailPanel";

export function InspectorScreen({ queue, onUpdateSamples, onPushToast }) {
  const [query, setQuery] = useState("");
  const [shake, setShake] = useState(false);
  const [foundSample, setFoundSample] = useState(null);
  const [foundPatient, setFoundPatient] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function search(raw) {
    const val = raw.trim();
    if (!val) return;
    for (const patient of queue) {
      const match = (patient.samples || []).find((s) => s.id === val);
      if (match) {
        setFoundSample(match);
        setFoundPatient(patient);
        setQuery("");
        return;
      }
    }
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }

  function handleSubmit(e) {
    e.preventDefault();
    search(query);
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
        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          <div className={"vp-scan-input-wrap" + (shake ? " is-error is-shake" : "")}>
            <I.Scan size={15} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Scan or type sample ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </form>
        <div className="vp-inspector-hint">Press Enter to look up · scanner sends Enter automatically</div>
      </div>
    </section>
  );
}
