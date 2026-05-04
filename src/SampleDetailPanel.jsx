// Left-rail inspector for a single tube/sample. Populated by scanning a
// tube barcode or clicking a tube/row anywhere in the workspace. The
// panel is the phlebotomist's "is this the right tube? what do I do
// next with it?" reference — kept beside the patient card so the
// operator never has to context-switch away from the active visit.

import { useState, useEffect } from "react";
import { I } from "./icons";
import { tubeByKey } from "./phleboData";

function fmtTime(s) {
  if (s == null) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtCountdown(ms) {
  if (ms == null || ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timerTone(remainingMs, totalMin) {
  if (remainingMs == null) return null;
  if (remainingMs <= 0) return "danger";
  const totalMs = totalMin * 60 * 1000;
  if (remainingMs < 5 * 60 * 1000) return "danger";
  if (remainingMs < 10 * 60 * 1000) return "warn";
  return "success";
}

function useNow(activeMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), activeMs);
    return () => clearInterval(t);
  }, [activeMs]);
  return now;
}

export function SampleDetailPanel({ sample, allSamples, onMarkInverted, onCollect, onDefer, onReset, onPickAnother, onScanFocus }) {
  const now = useNow(1000);

  if (!sample) {
    return (
      <aside className="vp-sdp vp-sdp-empty">
        <div className="vp-sdp-empty-glyph"><I.Scan size={28} /></div>
        <div className="vp-sdp-empty-title">Sample inspector</div>
        <p className="vp-sdp-empty-body">
          Scan a tube barcode or click a tube to inspect its spec, status, and handling.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm vp-sdp-empty-scan"
          onClick={() => onScanFocus?.()}
        >
          <I.Scan size={13} /> Scan tube barcode
        </button>
        {allSamples?.length > 0 && (
          <div className="vp-sdp-empty-quick">
            <div className="vp-sdp-empty-quick-label">Quick pick</div>
            <div className="vp-sdp-empty-quick-list">
              {allSamples.slice(0, 4).map(s => {
                const t = tubeByKey(s.tube);
                return (
                  <button key={s.id} type="button" className="vp-sdp-empty-quick-row" onClick={() => onPickAnother?.(s.id)}>
                    <span className="vp-sdp-empty-quick-dot" style={{ background: t.color, borderColor: t.stripeColor }} />
                    <span className="vp-sdp-empty-quick-name">{t.short}</span>
                    <span className="vp-sdp-empty-quick-id">{s.id.slice(-6)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    );
  }

  const tube = tubeByKey(sample.tube);
  const isCollected = sample.status === "collected";
  const isDeferred  = sample.status === "deferred";

  // Timer state (only when both collected and tube has a window)
  const collectedAtMs = sample.collectedAtMs || null;
  const limitMs = tube.timeLimitMin ? tube.timeLimitMin * 60 * 1000 : null;
  const remainingMs = (collectedAtMs && limitMs)
    ? collectedAtMs + limitMs - now
    : null;
  const tone = timerTone(remainingMs, tube.timeLimitMin);
  const expired = remainingMs != null && remainingMs <= 0;

  const inversionsRequired = tube.inversions || 0;
  const inverted = !!sample.inverted;

  return (
    <aside className="vp-sdp">
      <header className="vp-sdp-head" style={{ "--tube-color": tube.color, "--tube-stripe": tube.stripeColor }}>
        <span className="vp-sdp-tube-glyph">
          <span className="vp-sdp-tube-cap" />
          <span className="vp-sdp-tube-body">
            <span className="vp-sdp-tube-fluid" />
          </span>
        </span>
        <div className="vp-sdp-head-text">
          <div className="vp-sdp-eyebrow">Sample inspector · #{tube.order}</div>
          <h3 className="vp-sdp-title">{tube.stopperLabel}</h3>
          <div className="vp-sdp-additive">{tube.additive}</div>
        </div>
        {onPickAnother && (
          <button
            type="button"
            className="vp-sdp-close"
            onClick={() => onPickAnother(null)}
            aria-label="Clear inspector"
            title="Clear inspector"
          >
            <I.X size={14} />
          </button>
        )}
      </header>

      <div className="vp-sdp-section">
        <div className="vp-sdp-row">
          <span className="vp-sdp-row-key">Sample ID</span>
          <span className="vp-sdp-row-val vp-sdp-mono">{sample.id}</span>
        </div>
        <div className="vp-sdp-row">
          <span className="vp-sdp-row-key">Volume</span>
          <span className="vp-sdp-row-val">{sample.volumeMl} mL</span>
        </div>
        <div className="vp-sdp-row">
          <span className="vp-sdp-row-key">Container</span>
          <span className="vp-sdp-row-val">{sample.container}</span>
        </div>
        <div className="vp-sdp-row vp-sdp-row-stack">
          <span className="vp-sdp-row-key">Tests</span>
          <div className="vp-sdp-tests">
            {sample.tests.map(t => <span key={t} className="vp-sdp-test-pill">{t}</span>)}
          </div>
        </div>
        {sample.stat && (
          <div className="vp-sdp-row">
            <span className="vp-sdp-row-key">Priority</span>
            <span className="vp-pill vp-tone-danger">STAT</span>
          </div>
        )}
      </div>

      <div className="vp-sdp-section">
        <div className="vp-sdp-section-title">Status</div>
        <div className="vp-sdp-status-grid">
          <div className="vp-sdp-status-cell">
            <div className="vp-sdp-status-label">Collection</div>
            <div className="vp-sdp-status-val">
              {isCollected ? (
                <span className="vp-pill vp-tone-success"><I.CheckCircle size={11} /> Collected</span>
              ) : isDeferred ? (
                <span className="vp-pill vp-tone-warn"><I.Clock size={11} /> Deferred</span>
              ) : (
                <span className="vp-pill vp-tone-info">Pending</span>
              )}
            </div>
            {sample.collectedAt && (
              <div className="vp-sdp-status-meta">at {sample.collectedAt}{sample.collectedBy ? ` · ${sample.collectedBy}` : ""}</div>
            )}
            {sample.deferReason && (
              <div className="vp-sdp-status-meta">Reason: {sample.deferReason}</div>
            )}
          </div>

          {inversionsRequired > 0 && (
            <div className="vp-sdp-status-cell">
              <div className="vp-sdp-status-label">
                Inversions
                <span className="vp-sdp-inv-target">×{inversionsRequired}</span>
              </div>
              <div className="vp-sdp-status-val">
                {inverted ? (
                  <span className="vp-pill vp-tone-success">
                    <I.Check size={11} /> Inverted ×{inversionsRequired}
                  </span>
                ) : isCollected ? (
                  <span className="vp-pill vp-tone-warn">
                    <I.AlertTriangle size={11} /> Pending invert
                  </span>
                ) : (
                  <span className="vp-pill vp-tone-muted">After collect</span>
                )}
              </div>
              {!inverted && isCollected && (
                <button type="button" className="btn btn-primary btn-sm vp-sdp-inv-btn" onClick={() => onMarkInverted?.(sample.id)}>
                  <I.RefreshCw size={13} /> Mark inverted ×{inversionsRequired}
                </button>
              )}
            </div>
          )}
        </div>

        {tube.timeLimitMin && (
          <div className={"vp-sdp-timer" + (tone ? " vp-tone-" + tone : "")}>
            <div className="vp-sdp-timer-icon" aria-hidden="true">
              <I.Clock size={18} />
            </div>
            <div className="vp-sdp-timer-body">
              <div className="vp-sdp-timer-label">
                Process within {tube.timeLimitMin} min
              </div>
              {collectedAtMs ? (
                <div className="vp-sdp-timer-row">
                  <span className="vp-sdp-timer-num">{fmtCountdown(remainingMs)}</span>
                  <span className="vp-sdp-timer-tag">
                    {expired ? "TAT exceeded — flag lab" : "remaining"}
                  </span>
                </div>
              ) : (
                <div className="vp-sdp-timer-tag">Starts when collected</div>
              )}
            </div>
            {tube.timeLimitMin && collectedAtMs && (
              <div
                className="vp-sdp-timer-bar"
                style={{
                  "--pct": Math.max(0, Math.min(1, remainingMs / limitMs)) * 100 + "%",
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="vp-sdp-section">
        <div className="vp-sdp-section-title">Handling</div>
        <ul className="vp-sdp-handling">
          {(tube.handling || []).map((h, i) => (
            <li key={i}><I.Check size={11} /> <span>{h}</span></li>
          ))}
        </ul>
      </div>

      <div className="vp-sdp-actions">
        {!isCollected && !isDeferred && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onCollect?.(sample.id)}>
            <I.Check size={13} /> Collect now
          </button>
        )}
        {(isCollected || isDeferred) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onReset?.(sample.id)}>
            <I.RefreshCw size={13} /> Reset
          </button>
        )}
        <span className="vp-sdp-actions-hint">
          {!isCollected && !isDeferred ? "Use the table row for Defer" : ""}
        </span>
      </div>
    </aside>
  );
}
