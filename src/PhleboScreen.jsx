// Phlebotomy workspace — pre-analytical checklist, tube rack
// (Order of Draw), and the sample collection table.
//
// `focusedSampleId` is owned by the parent so the left-rail
// SampleDetailPanel and this screen stay in sync — clicking a tube,
// scanning a tube barcode, or interacting with a row updates the same
// state.

import { useState, useMemo, useRef, useEffect } from "react";
import { I } from "./icons";
import { TUBE_CATALOG, tubeByKey, ARM_SITES } from "./phleboData";

// Live-updating clock so timer chips repaint every second.
function useNow(activeMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), activeMs);
    return () => clearInterval(t);
  }, [activeMs]);
  return now;
}

function fmtCountdown(ms) {
  if (ms == null) return "—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------- Tube visual ----------
function Tube({ tube, count = 1, status, dim, focused, needsInvert, onClick }) {
  const isCollected = status === "collected";
  const isDeferred  = status === "deferred";
  return (
    <button
      type="button"
      className={
        "vp-tube" +
        (dim ? " is-dim" : "") +
        (focused ? " is-focused" : "") +
        (isCollected ? " is-collected" : "") +
        (isDeferred  ? " is-deferred"  : "") +
        (needsInvert ? " is-needs-invert" : "")
      }
      onClick={onClick}
      aria-label={`${tube.stopperLabel} ×${count}${isCollected ? " collected" : isDeferred ? " deferred" : ""}`}
      title={`${tube.stopperLabel} — ${tube.additive}${tube.inversions ? ` · invert ×${tube.inversions}` : ""}`}
    >
      {tube.inversions > 0 && !dim && (
        <span className="vp-tube-inv-badge" aria-hidden="true">
          <I.RefreshCw size={9} />
          <span>×{tube.inversions}</span>
        </span>
      )}
      <span className="vp-tube-cap" style={{ background: tube.color, borderColor: tube.stripeColor }} />
      <span className="vp-tube-body">
        <span className="vp-tube-fluid" />
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
      const cur = map.get(s.tube) || { count: 0, status: s.status, sample: s, needsInvert: false };
      cur.count += 1;
      if (s.status !== "collected" && cur.status === "collected") cur.status = s.status;
      if (s.status === "deferred") cur.status = "deferred";
      const tube = tubeByKey(s.tube);
      if (s.status === "collected" && tube?.inversions > 0 && !s.inverted) {
        cur.needsInvert = true;
      }
      map.set(s.tube, cur);
    }
    return map;
  }, [samples]);

  const focusedTubeKey = useMemo(() => {
    const s = samples.find(x => x.id === focusedId);
    return s?.tube;
  }, [samples, focusedId]);

  return (
    <div className="vp-rack">
      <div className="vp-rack-head">
        <div>
          <span className="vp-rack-eyebrow">Order of Draw · CLSI</span>
          <h3 className="vp-rack-title">Tube rack</h3>
        </div>
        <span className="vp-rack-legend">
          <span className="vp-rack-legend-item"><span className="vp-rack-legend-dot vp-tone-success" /> Collected</span>
          <span className="vp-rack-legend-item"><span className="vp-rack-legend-dot vp-tone-warn" /> Needs invert</span>
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
              needsInvert={req?.needsInvert}
              focused={focusedTubeKey === tube.key}
              onClick={() => onSelect?.(req ? req.sample.id : null)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------- Sample row ----------
function SampleRow({ index, sample, onCollect, onDefer, onMarkInverted, onInspect, onReset, focused, now }) {
  const tube = tubeByKey(sample.tube);
  const isCollected = sample.status === "collected";
  const isDeferred  = sample.status === "deferred";
  const inversionsRequired = tube?.inversions || 0;
  const needsInvert = isCollected && inversionsRequired > 0 && !sample.inverted;

  const limitMs = tube?.timeLimitMin ? tube.timeLimitMin * 60 * 1000 : null;
  const remainingMs = (sample.collectedAtMs && limitMs) ? sample.collectedAtMs + limitMs - now : null;
  const expired = remainingMs != null && remainingMs <= 0;
  const timerTone =
    remainingMs == null ? null :
    remainingMs <= 0 ? "danger" :
    remainingMs < 5 * 60 * 1000 ? "danger" :
    remainingMs < 10 * 60 * 1000 ? "warn" : "success";

  return (
    <tr
      className={"vp-st-row" + (isCollected ? " is-collected" : "") + (isDeferred ? " is-deferred" : "") + (focused ? " is-focused" : "")}
      onClick={() => onInspect?.(sample.id)}
    >
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
      <td className="vp-st-invert">
        {inversionsRequired > 0 ? (
          isCollected ? (
            sample.inverted ? (
              <span className="vp-pill vp-tone-success vp-st-invert-pill">
                <I.Check size={10} /> ×{inversionsRequired}
              </span>
            ) : (
              <button
                type="button"
                className="vp-st-invert-cta"
                onClick={(e) => { e.stopPropagation(); onMarkInverted(sample.id); }}
                title="Confirm inversion mixing"
              >
                <I.RefreshCw size={11} />
                <span>Invert ×{inversionsRequired}</span>
              </button>
            )
          ) : (
            <span className="vp-st-invert-hint" aria-hidden="true">
              <I.RefreshCw size={11} /> ×{inversionsRequired}
            </span>
          )
        ) : (
          <span className="vp-st-invert-na">—</span>
        )}
      </td>
      <td className="vp-st-timer">
        {limitMs && isCollected && (
          <span className={"vp-pill vp-st-timer-pill" + (timerTone ? " vp-tone-" + timerTone : "")}>
            <I.Clock size={10} />
            <span className="vp-st-timer-num">{fmtCountdown(remainingMs)}</span>
          </span>
        )}
        {limitMs && !isCollected && !isDeferred && (
          <span className="vp-st-timer-hint">{tube.timeLimitMin}m TAT</span>
        )}
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
      <td className="vp-st-action" onClick={(e) => e.stopPropagation()}>
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
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onReset(sample.id)}>
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
  const tube = tubeByKey(sample.tube);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="between">
            <h2>Defer sample</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><I.X size={14} /></button>
          </div>
        </div>
        <div className="modal-body defer-modal-body">
          <div className="defer-sample-summary">
            <span className="defer-sample-dot" style={{ background: tube.color, borderColor: tube.stripeColor }} aria-hidden="true" />
            <span className="defer-sample-id">{sample.id}</span>
            <span className="defer-sample-divider">·</span>
            <span className="defer-sample-tube">{tube.stopperLabel}</span>
            <span className="defer-sample-divider">·</span>
            <span className="defer-sample-tests">{sample.tests.join(", ")}</span>
          </div>
          <label className="field">
            <span className="label">Reason</span>
            <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
              {DEFER_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Note (optional)</span>
            <textarea className="input defer-note-input" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add context for the next attempt..." />
          </label>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onConfirm({ reason, note })}>Confirm defer</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Whole workspace ----------
export function PhleboScreen({
  patient,
  samples,
  onUpdateSamples,
  onSubmit,
  onSaveDraft,
  onPushToast,
  focusedSampleId,
  onFocusSample,
  onMarkVitalsDone,
}) {
  const [checks, setChecks] = useState({ id: false, fasting: false, allergy: false, consent: false, site: false });
  const [arm, setArm] = useState("L");
  const [site, setSite] = useState(ARM_SITES[0]);
  const [deferTarget, setDeferTarget] = useState(null);
  const [scanValue, setScanValue] = useState("");
  const [confirmInvertSkipped, setConfirmInvertSkipped] = useState(false);
  const [dismissedVitalsWarningFor, setDismissedVitalsWarningFor] = useState(null);
  const scanRef = useRef(null);
  const now = useNow(1000);

  useEffect(() => {
    scanRef.current?.focus();
  }, [patient?.id]);

  useEffect(() => {
    setDismissedVitalsWarningFor(null);
  }, [patient?.id]);

  const collectedCount = samples.filter(s => s.status === "collected").length;
  const allCollected = samples.length > 0 && collectedCount === samples.length;
  const anyOpen = samples.some(s => s.status !== "collected" && s.status !== "deferred");

  // Inversions still pending — gate the submit until phlebotomist either
  // confirms each one or explicitly accepts the override.
  const pendingInversions = samples.filter(s => {
    if (s.status !== "collected") return false;
    const tube = tubeByKey(s.tube);
    return (tube?.inversions || 0) > 0 && !s.inverted;
  });
  const inversionsBlocking = pendingInversions.length > 0;

  const setStatus = (id, patch) => {
    onUpdateSamples(samples.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const collect = (id) => {
    const ms = Date.now();
    const at = new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setStatus(id, {
      status: "collected",
      collectedAt: at,
      collectedAtMs: ms,
      collectedBy: "Linh Nguyen",
      inverted: false,
    });
    onFocusSample?.(id);
    const tube = tubeByKey(samples.find(s => s.id === id)?.tube);
    const invertNote = tube?.inversions ? ` — invert ×${tube.inversions} now` : "";
    onPushToast?.({ tone: "success", text: `Collected ${id}${invertNote}` });
  };

  const reset = (id) => {
    setStatus(id, {
      status: "generated",
      collectedAt: undefined,
      collectedAtMs: undefined,
      collectedBy: undefined,
      inverted: false,
      deferReason: undefined,
      deferNote: undefined,
    });
    onPushToast?.({ tone: "info", text: `Reset ${id} — back to generated` });
  };

  const markInverted = (id) => {
    setStatus(id, { inverted: true });
    onPushToast?.({ tone: "success", text: `Inversion confirmed for ${id}` });
  };

  const defer = (id) => {
    const s = samples.find(x => x.id === id);
    setDeferTarget(s);
  };

  const confirmDefer = ({ reason, note }) => {
    if (!deferTarget) return;
    setStatus(deferTarget.id, { status: "deferred", deferReason: reason, deferNote: note });
    onPushToast?.({ tone: "warn", text: `Deferred ${deferTarget.id} — ${reason}` });
    setDeferTarget(null);
  };

  const markAllCollected = () => {
    const ms = Date.now();
    const at = new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    onUpdateSamples(samples.map(s =>
      s.status === "generated"
        ? { ...s, status: "collected", collectedAt: at, collectedAtMs: ms, collectedBy: "Linh Nguyen", inverted: false }
        : s
    ));
    onPushToast?.({ tone: "success", text: "All open samples marked collected — confirm inversions next" });
  };

  // Scan field: the phlebotomist's primary input. Scanning a generated
  // tube collects it; scanning an already-collected tube focuses the
  // detail panel so they can review or mark inverted; unknown ID errors.
  const onScanKey = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const id = scanValue.trim();
    if (!id) return;
    const s = samples.find(x => x.id === id);
    if (!s) {
      onPushToast?.({ tone: "danger", text: `No sample matches ${id}` });
      onFocusSample?.(null);
    } else if (s.status === "collected") {
      onFocusSample?.(id);
      onPushToast?.({ tone: "info", text: `${id} already collected — opened in inspector` });
    } else if (s.status === "deferred") {
      onFocusSample?.(id);
      onPushToast?.({ tone: "info", text: `${id} is deferred — opened in inspector` });
    } else {
      collect(id);
    }
    setScanValue("");
  };

  const inspect = (id) => onFocusSample?.(id);

  const vitalsMissing = patient && patient.journey?.vitals !== "done";
  const showVitalsWarning = vitalsMissing && dismissedVitalsWarningFor !== patient.id;

  const canSubmit = allCollected && (!inversionsBlocking || confirmInvertSkipped);

  return (
    <section className="vp-phs">
      {showVitalsWarning && (
        <div className="vp-banner vp-tone-warn" role="status">
          <I.AlertTriangle size={14} />
          <div className="vp-banner-text">
            <strong>Vital Signs not yet recorded.</strong> You can continue, or send the patient to the Vital Signs booth first.
          </div>
          <div className="vp-banner-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDismissedVitalsWarningFor(patient.id);
                scanRef.current?.focus();
              }}
            >
              Continue anyway
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onMarkVitalsDone?.();
                scanRef.current?.focus();
              }}
            >
              Mark done at another booth
            </button>
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

      <TubeRack samples={samples} onSelect={inspect} focusedId={focusedSampleId} />

      <div className="vp-st-toolbar">
        <div className="vp-st-scan-field">
          <I.Scan size={14} />
          <input
            ref={scanRef}
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            onKeyDown={onScanKey}
            placeholder="Scan tube barcode — collect, or open in inspector if already done…"
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
              <th>Inversion</th>
              <th>TAT</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {samples
              .slice()
              .sort((a, b) => tubeByKey(a.tube).order - tubeByKey(b.tube).order)
              .map((s) => (
                <SampleRow
                  key={s.id}
                  index={tubeByKey(s.tube).order - 1}
                  sample={s}
                  onCollect={collect}
                  onDefer={defer}
                  onMarkInverted={markInverted}
                  onInspect={inspect}
                  onReset={reset}
                  focused={focusedSampleId === s.id}
                  now={now}
                />
              ))}
          </tbody>
        </table>
      </div>

      {inversionsBlocking && allCollected && (
        <div className="vp-vf-confirm">
          <label className="vp-vf-confirm-label">
            <input
              type="checkbox"
              checked={confirmInvertSkipped}
              onChange={(e) => setConfirmInvertSkipped(e.target.checked)}
            />
            <span>
              <strong>Override inversion confirmation.</strong>{" "}
              {pendingInversions.length} tube{pendingInversions.length === 1 ? "" : "s"} not yet confirmed inverted —
              skipping inversions can clot the sample. Mark each inverted from the inspector or table; only override if you've already done so on the bench.
            </span>
          </label>
        </div>
      )}

      <footer className="vp-phs-actions">
        <button type="button" className="btn btn-ghost" onClick={onSaveDraft}>Save draft</button>
        <div className="vp-vf-actions-right">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSubmit}
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
