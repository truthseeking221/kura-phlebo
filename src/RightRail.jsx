// === Right rail: PayerModel + combined VisitStatusCard ===
import React from "react";
import { I } from "./icons";
import { payerOptions } from "./data";
import { useLang } from "./i18n";

export function PayerModel({ patient, onSelect }) {
  const t = useLang();
  const payerNameKeys = {
    direct: "payer.direct", insurance: "payer.insurance",
    corporate: "payer.corporate", referral: "payer.referral",
  };
  const payerCaptionKeys = {
    direct: "payer.direct.caption", insurance: "payer.insurance.caption",
    corporate: "payer.corporate.caption", referral: "payer.referral.caption",
  };
  return (
    <div className="card card-pad">
      <h2 style={{ margin: 0, fontSize: "var(--font-lg)", fontWeight: 650, color: "var(--ink-900)", letterSpacing: "-0.01em", marginBottom: 12 }}>{t("payer.title")}</h2>
      <div className="payer-grid">
        {payerOptions.map(p => {
          const Ico = I[p.icon];
          const active = patient.payer === p.id;
          return (
            <button
              key={p.id}
              className={"payer-card" + (active ? " active" : "")}
              onClick={() => onSelect(p.id)}
              type="button"
            >
              <Ico size={22} className="payer-icon" />
              <span className="payer-name">{t(payerNameKeys[p.id])}</span>
            </button>
          );
        })}
      </div>
      <div className="payer-foot">
        {t(payerCaptionKeys[patient.payer])}
      </div>
    </div>
  );
}

// ============================================================
// VISIT STATUS — combined Documents · PWA · Handoff card
// ============================================================
export function VisitStatusCard({ patient, onViewDocs, onViewTimeline }) {
  const t = useLang();

  const docs = [
    { key: "id",        nameKey: "docs.id",        state: patient.documents.id },
    { key: "consent",   nameKey: "docs.consent",   state: patient.documents.consent },
    { key: "insurance", nameKey: "docs.insurance", state: patient.documents.insurance },
    { key: "receipt",   nameKey: "docs.receipt",   state: patient.documents.receipt },
  ];
  const docsOk = docs.filter(d => d.state === "ok").length;
  const docsTotal = docs.length;

  const handoffSteps = [
    { labelKey: "handoff.reception",  icon: "User" },
    { labelKey: "handoff.patientPwa", icon: "Headset" },
    { labelKey: "handoff.nurse",      icon: "Stethoscope" },
    { labelKey: "handoff.lab",        icon: "Flask" },
  ];
  const stateLabel = (state, i) => {
    if (state === "done")        return t("handoff.done");
    if (state === "in-progress") return t("handoff.inProgress");
    if (state === "blocked")     return t("handoff.blocked");
    return i === 0 ? t("handoff.new") : t("handoff.pending");
  };

  const iconFor = (state) =>
    state === "ok" ? <I.CheckCircle size={14} style={{ color: "var(--success-500)" }} /> :
    state === "warn" ? <I.AlertCircle size={14} style={{ color: "var(--warn-500)" }} /> :
    state === "danger" ? <I.XCircle size={14} style={{ color: "var(--danger-500)" }} /> :
    <I.Clock size={14} style={{ color: "var(--ink-400)" }} />;

  return (
    <div className="card visit-status">
      <div className="card-head">
        <div>
          <h2>{t("vs.title")}</h2>
          <div className="sub">{t("vs.subtitle")}</div>
        </div>
        <span className="vs-live">
          <I.Smartphone size={12} /> {t("pwa.live")}
        </span>
      </div>

      <div className="card-pad" style={{ paddingTop: 4, paddingBottom: 0 }}>
        {/* Section 1: Handoff (most important — shows current step) */}
        <div className="vs-section">
          <div className="vs-section-head">
            <div className="vs-section-title">{t("handoff.title")}</div>
            <button className="vs-link-btn" onClick={onViewTimeline}>
              {t("handoff.viewTimeline")} <I.ChevronRight size={12} />
            </button>
          </div>
          <div className="handoff handoff-compact">
            {handoffSteps.map((s, i) => {
              const Ico = I[s.icon];
              const state = patient.handoffStates[i] || "pending";
              const cls = state === "done" ? "done" : state === "in-progress" ? "active" : state === "blocked" ? "blocked" : "";
              return (
                <React.Fragment key={i}>
                  <div className={"handoff-step " + cls}>
                    <div className="h-icon">
                      <Ico size={16} />
                      {patient.handoff === i && <span className="h-num">{i + 1}</span>}
                    </div>
                    <div className="h-label">{t(s.labelKey)}</div>
                    <div className="h-state">{stateLabel(state, i)}</div>
                  </div>
                  {i < handoffSteps.length - 1 && <I.ArrowRight size={12} className="handoff-arrow" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Section 2: Required Documents */}
        <div className="vs-section">
          <div className="vs-section-head">
            <div className="vs-section-title">{t("docs.title")}</div>
            <span className="vs-count">{docsOk}/{docsTotal}</span>
          </div>
          <div className="doc-list compact">
            {docs.map(d => {
              const ok = d.state === "ok";
              return (
                <div key={d.key} className="doc-row">
                  <div className={"doc-check " + (ok ? "ok" : "pending")}>
                    {ok ? <I.Check size={10} strokeWidth={2.5} /> : <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--ink-300)" }} />}
                  </div>
                  <div className="doc-name">{t(d.nameKey)}</div>
                  <div className={"doc-status " + (ok ? "ok" : "pending")}>{ok ? "" : t("docs.pending")}</div>
                </div>
              );
            })}
          </div>
          <button className="vs-link-btn vs-link-block" onClick={onViewDocs}>
            <span>{t("docs.viewAll")}</span>
            <I.ChevronRight size={12} />
          </button>
        </div>

        {/* Section 3: Patient PWA log (least important — collapsed style) */}
        <div className="vs-section">
          <div className="vs-section-head">
            <div className="vs-section-title">{t("pwa.title")}</div>
          </div>
          <div className="pwa-log compact">
            {patient.pwaLog.slice(0, 3).map((l, i) => (
              <div key={i} className="log-row">
                {iconFor(l.state)}
                <div className="log-text">{l.text}</div>
                <div className="log-time">{l.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height: "var(--card-pad)" }} />
    </div>
  );
}
