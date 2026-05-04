// Phlebotomy workspace — pre-analytical checklist, tube rack
// (Order of Draw), and the sample collection table.

import { useState, useMemo, useRef, useEffect } from "react";
import { I } from "./icons";
import { TUBE_CATALOG, tubeByKey, ARM_SITES } from "./phleboData";

// ---------- Tube visual ----------
function Tube({ tube, count = 1, status, dim, onClick }) {
  const isCollected = status === "collected";
  const isDeferred  = status === "deferred";
  return (
    <button
      type="button"
      className={
        "vp-tube" +
        (dim ? " is-dim" : "") +
        (isCollected ? " is-collected" : "") +
        (isDeferred  ? " is-deferred"  : "")
      }
      onClick={onClick}
      aria-label={`${tube.stopperLabel} ×${count}${isCollected ? " collected" : isDeferred ? " deferred" : ""}`}
      title={`${tube.stopperLabel} — ${tube.additive}`}
    >
      <span className="vp-tube-cap" style={{ background: tube.color, borderColor: tube.stripeColor }} />
      <span className="vp-tube-body">
        <span className="vp-tube-fluid" style={{ background: `linear-gradient(180deg, ${tube.color}55, ${tube.color}88)` }} />
      </span>
      {count > 1 && <span className="vp-tube-badge">×{count}</span>}
      {isCollected && (
        <span className="vp-tube-check" aria-hidden="true"><I.Check size={12} /></span>
      )}
      {isDeferred && (
        <span className="vp-tube-defer" aria-hidden="true"><I.Clock size={11} /></span>
      )}
      <span className="vp-tube-caption">
        <span className="vp-tube-caption-name">{tube.short}</span>
        <span className="vp-tube-caption-order">#{tube.order}</span>
      </span>
    </button>
  );
}

// ---------- Pre-analytical checklist ----------
function Checklist({ checks, onToggle, arm, onArm, site, onSite }) {
  const items = [
    { id: "id",       label: "Patient ID confirmed" },
    { id: "fasting",  label: "Fasting status checked" },
    { id: "allergy",  label: "Allergies reviewed" },
    { id: "consent",  label: "Patient consented" },
    { id: "site",     label: "Site confirmed (L/R arm)" },
  ];
  return (
    <div className="vp-pre">
      <div className="vp-pre-head">
        <span className="vp-pre-eyebrow">Pre-analytical</span>
        <span className="vp-pre-progress">
          {Object.values(checks).filter(Boolean).length}/{items.length} confirmed
        </span>
      </div>
      <div className="vp-pre-chips">
        {items.map(it => {
          const on = !!checks[it.id];
          return (
            <button
              key={it.id}
              type="button"
              className={"vp-chip" + (on ? " is-on" : "")}
              onClick={() => onToggle(it.id)}
              aria-pressed={on}
            >
              <span className="vp-chip-tick" aria-hidden="true">
                {on ? <I.Check size={12} /> : null}
              </span>
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>

      <div className="vp-pre-arm">
        <div className="vp-pre-arm-row">
          <span className="vp-pre-arm-label">Arm</span>
          <div className="vp-arm-toggle" role="radiogroup" aria-label="Arm">
            <button
              type="button"
              role="radio"
              aria-checked={arm === "L"}
              className={"vp-arm-btn" + (arm === "L" ? " is-on" : "")}
              onClick={() => onArm("L")}
            >
              <span className="vp-arm-glyph vp-arm-l" aria-hidden="true" />
              <span>Left</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={arm === "R"}
              className={"vp-arm-btn" + (arm === "R" ? " is-on" : "")}
              onClick={() => onArm("R")}
            >
              <span className="vp-arm-glyph vp-arm-r" aria-hidden="true" />
              <span>Right</span>
            </button>
          </div>
        </div>

        <label className="vp-pre-site">
          <span className="vp-pre-arm-label">Site</span>
          <select value={site} onChange={(e) => onSite(e.target.value)}>
            {ARM_SITES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

// ---------- Tube rack ----------
function TubeRack({ samples, onSelect, focusedId }) {
  // Group required samples by tube key (sum counts for visual badge).
  const requiredCounts = useMemo(() => {
    const map = new Map();
    for (const s of samples) {
      const cur = map.get(s.tube) || { count: 0, status: s.status, sample: s };
      cur.count += 1;
      // Worst-status wins for the visual: any non-collected dominates collected display.
      if (s.status !== "collected" && cur.status === "collected") cur.status = s.status;
      if (s.status === "deferred") cur.status = "deferred";
      map.set(s.tube, cur);
    }
    return map;
  }, [samples]);

  return (
    <div className="vp-rack">
      <div className="vp-rack-head">
        <div>
          <span className="vp-rack-eyebrow">Order of Draw · CLSI</span>
          <h3 className="vp-rack-title">Tube rack</h3>
        </div>
        <span className="vp-rack-legend">
          <span className="vp-rack-legend-item"><span className="vp-rack-legend-dot vp-tone-success" /> Collected</span>
          <span className="vp-rack-legend-item"><span className="vp-rack-legend-dot vp-tone-warn" /> Deferred</span>
          <span className="vp-rack-legend-item"><span className="vp-rack-legend-dot vp-tone-muted" /> Not needed</span>
        </span>
      </div>
      <div className="vp-rack-strip">
        {TUBE_CATALOG.map(tube => {
          const req = requiredCounts.get(tube.key);
          const dim = !req;
          const status = req ? req.status : null;
          return (
            <Tube
              key={tube.key}
              tube={tube}
              count={req?.count || 0}
              status={status}
              dim={dim}
              onClick={() => req && onSelect?.(req.sample.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------- Sample table ----------
function SampleRow({ index, sample, onCollect, onDefer, onScan, scanInputRef, focused }) {
  const tube = tubeByKey(sample.tube);
  const isCollected = sample.status === "collected";
  const isDeferred  = sample.status === "deferred";
  return (
    <tr className={"vp-st-row" + (isCollected ? " is-collected" : "") + (isDeferred ? " is-deferred" : "") + (focused ? " is-focused" : "")}>
      <td className="vp-st-num">{index + 1}</td>
      <td>
        <div className="vp-st-tube">
          <span className="vp-st-tube-dot" style={{ background: tube.color, borderColor: tube.stripeColor }} />
          <div>
            <div className="vp-st-tube-name">{tube.stopperLabel}</div>
            <div className="vp-st-tube-sub">{tube.additive}</div>
          </div>
        </div>
      </td>
      <td className="vp-st-id">
        <span className="vp-st-id-mono">{sample.id}</span>
      </td>
      <td className="vp-st-tests">
        {sample.tests.slice(0, 2).join(", ")}
        {sample.tests.length > 2 && (
          <span className="vp-st-tests-more"> +{sample.tests.length - 2}</span>
        )}
      </td>
      <td className="vp-st-vol">{sample.volumeMl} mL</td>
      <td className="vp-st-cont">{sample.container}</td>
      <td className="vp-st-stat">
        {sample.stat && <span className="vp-pill vp-tone-danger">STAT</span>}
      </td>
      <td className="vp-st-status">
        {isCollected ? (
          <span className="vp-pill vp-tone-success">
            <I.CheckCircle size={11} /> Collected
            {sample.collectedAt && <span className="vp-st-status-time"> · {sample.collectedAt}</span>}
          </span>
        ) : isDeferred ? (
          <span className="vp-pill vp-tone-warn"><I.Clock size={11} /> Deferred</span>
        ) : (
          <span className="vp-pill vp-tone-info">Generated</span>
        )}
      </td>
      <td className="vp-st-action">
        {!isCollected && !isDeferred && (
          <>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onCollect(sample.id)}>
              <I.Check size={13} /> Collect
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDefer(sample.id)}>
              <I.Clock size={13} /> Defer
            </button>
          </>
        )}
        {(isCollected || isDeferred) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCollect(sample.id, "reset")}>
            <I.RefreshCw size={13} /> Reset
          </button>
        )}
      </td>
    </tr>
  );
}

// ---------- Defer modal ----------
const DEFER_REASONS = [
  "Patient refused", "Difficult vein", "Insufficient volume", "Revisit later", "Other",
];

function DeferModal({ sample, onClose, onConfirm }) {
  const [reason, setReason] = useState(DEFER_REASONS[0]);
  const [note, setNote] = useState("");
  if (!sample) return null;
  return (
    <div className="vp-modal-scrim" onClick={onClose}>
      <div className="vp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="vp-modal-head">
          <h3>Defer sample</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><I.X size={14} /></button>
        </div>
        <div className="vp-modal-body">
          <div className="vp-modal-meta">
            <span>{sample.id}</span>
            <span>·</span>
            <span>{tubeByKey(sample.tube).stopperLabel}</span>
            <span>·</span>
            <span>{sample.tests.join(", ")}</span>
          </div>
          <label className="vp-vf-field">
            <span className="vp-vf-label">Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {DEFER_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="vp-vf-field">
            <span className="vp-vf-label">Note (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add context for the next attempt…" />
          </label>
        </div>
        <div className="vp-modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onConfirm({ reason, note })}>Confirm defer</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Whole workspace ----------
export function PhleboScreen({ patient, samples, onUpdateSamples, onSubmit, onSaveDraft, onPushToast }) {
  const [checks, setChecks] = useState({ id: false, fasting: false, allergy: false, consent: false, site: false });
  const [arm, setArm] = useState("L");
  const [site, setSite] = useState(ARM_SITES[0]);
  const [deferTarget, setDeferTarget] = useState(null);
  const [scanValue, setScanValue] = useState("");
  const [focusedSampleId, setFocusedSampleId] = useState(null);
  const scanRef = useRef(null);

  useEffect(() => {
    // Hot-key scanner field after mounting.
    scanRef.current?.focus();
  }, []);

  const collectedCount = samples.filter(s => s.status === "collected").length;
  const allCollected = samples.length > 0 && collectedCount === samples.length;
  const anyOpen = samples.some(s => s.status !== "collected" && s.status !== "deferred");

  const setStatus = (id, status, extra = {}) => {
    onUpdateSamples(samples.map(s => s.id === id ? { ...s, status, ...extra } : s));
  };

  const collect = (id, mode) => {
    if (mode === "reset") {
      setStatus(id, "generated", { collectedAt: undefined, deferReason: undefined });
      onPushToast?.({ tone: "info", text: `Reset ${id} — back to generated` });
      return;
    }
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setStatus(id, "collected", { collectedAt: now, collectedBy: "Linh Nguyen" });
    onPushToast?.({ tone: "success", text: `Collected ${id}` });
  };

  const defer = (id) => {
    const s = samples.find(x => x.id === id);
    setDeferTarget(s);
  };

  const confirmDefer = ({ reason, note }) => {
    if (!deferTarget) return;
    setStatus(deferTarget.id, "deferred", { deferReason: reason, deferNote: note });
    onPushToast?.({ tone: "warn", text: `Deferred ${deferTarget.id} — ${reason}` });
    setDeferTarget(null);
  };

  const markAllCollected = () => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    onUpdateSamples(samples.map(s => s.status === "generated" ? { ...s, status: "collected", collectedAt: now, collectedBy: "Linh Nguyen" } : s));
    onPushToast?.({ tone: "success", text: "All open samples marked collected" });
  };

  // Barcode confirmation: scan a sample id to mark collected.
  const onScanKey = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const id = scanValue.trim();
    const s = samples.find(x => x.id === id);
    if (!s) {
      onPushToast?.({ tone: "danger", text: `No sample matches ${id}` });
    } else if (s.status === "collected") {
      onPushToast?.({ tone: "info", text: `${id} already collected` });
    } else {
      collect(id);
    }
    setScanValue("");
    setFocusedSampleId(id);
  };

  const vitalsMissing = patient && patient.journey?.vitals !== "done";

  return (
    <section className="vp-phs">
      {vitalsMissing && (
        <div className="vp-banner vp-tone-warn" role="status">
          <I.AlertTriangle size={14} />
          <div className="vp-banner-text">
            <strong>Vital Signs not yet recorded.</strong> You can continue, or send the patient to the Vital Signs booth first.
          </div>
          <div className="vp-banner-actions">
            <button type="button" className="btn btn-ghost btn-sm">Continue anyway</button>
            <button type="button" className="btn btn-secondary btn-sm">Mark done at another booth</button>
          </div>
        </div>
      )}

      <header className="vp-phs-head">
        <div>
          <div className="vp-vf-eyebrow">Booth · Phlebotomy</div>
          <h2 className="vp-vf-title">Collection workspace</h2>
        </div>
        <div className="vp-phs-progress">
          <span className="vp-phs-progress-num">{collectedCount}<span>/{samples.length}</span></span>
          <span className="vp-phs-progress-label">collected</span>
        </div>
      </header>

      <Checklist
        checks={checks}
        onToggle={(id) => setChecks(c => ({ ...c, [id]: !c[id] }))}
        arm={arm} onArm={setArm}
        site={site} onSite={setSite}
      />

      <TubeRack samples={samples} onSelect={setFocusedSampleId} focusedId={focusedSampleId} />

      <div className="vp-st-toolbar">
        <div className="vp-st-scan-field">
          <I.Scan size={14} />
          <input
            ref={scanRef}
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={onScanKey}
            placeholder="Scan tube barcode to confirm…"
            spellCheck={false}
          />
          <span className="kbd">Enter</span>
        </div>
        <div className="vp-st-toolbar-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={markAllCollected} disabled={!anyOpen}>
            <I.Check size={13} /> Mark all collected
          </button>
          <button type="button" className="btn btn-ghost btn-sm">
            <I.Printer size={13} /> Print barcode labels
          </button>
        </div>
      </div>

      <div className="vp-st-wrap">
        <table className="vp-st">
          <thead>
            <tr>
              <th>#</th>
              <th>Tube</th>
              <th>Sample ID</th>
              <th>Tests</th>
              <th>Vol</th>
              <th>Container</th>
              <th>STAT</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {samples
              .slice()
              .sort((a, b) => tubeByKey(a.tube).order - tubeByKey(b.tube).order)
              .map((s, i) => (
                <SampleRow
                  key={s.id}
                  index={i}
                  sample={s}
                  onCollect={collect}
                  onDefer={defer}
                  focused={focusedSampleId === s.id}
                />
              ))}
          </tbody>
        </table>
      </div>

      <footer className="vp-phs-actions">
        <button type="button" className="btn btn-ghost" onClick={onSaveDraft}>Save draft</button>
        <div className="vp-vf-actions-right">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allCollected}
            onClick={onSubmit}
          >
            Submit collection & next patient
            <I.ArrowRight size={14} />
          </button>
        </div>
      </footer>

      {deferTarget && (
        <DeferModal
          sample={deferTarget}
          onClose={() => setDeferTarget(null)}
          onConfirm={confirmDefer}
        />
      )}
    </section>
  );
}
