// === Visit Details · Lab Tests · Insurance · Payment (v3) ===
import React, { useState, useEffect, useRef, useMemo } from "react";
import { I } from "./icons";
import { useLang, VISIT_REASON_KEYS, VISIT_REASON_POPULAR } from "./i18n";
import {
  LAB_CATALOG,
  LAB_CATEGORIES,
  INSURANCE_PROVIDERS,
  VISIT_FEE,
  KHR_RATE,
} from "./data";
import { VisitReasonPills, VISIT_REASONS, AuthorBadge, fuzzyNameScore, playDrawerDing, DisabledTooltip } from "./shared";
import { DateInput } from "./DateInput";

// ============================================================
// VISIT DETAILS — Round 10 #4 Figma rebuild (185:14415)
//   Hero "Patient intake form" card + Intake progress (5 sections)
//   Receptionist can either (a) send PWA link to patient or
//   (b) fill on behalf of patient inline.
// ============================================================
export function VisitDetails({ patient, onUpdate, onSendToPhone, sentFlash }) {
  const t = useLang();
  const otpVerified = !!patient.otpVerified;
  const tgVerified = !!patient.telegramHandle;
  const channelReady = otpVerified || tgVerified;
  const channel = tgVerified && patient.commMethod === "telegram"
    ? { label: "Telegram", target: patient.telegramHandle }
    : otpVerified
      ? { label: t("vd.channel.mobile"), target: patient.mobile || `${patient.countryCode || ""} ${patient.phoneNumber || ""}`.trim() }
      : { label: "—", target: "—" };

  const sentAt = patient.pwaSentAt;
  const pwaSent = !!sentAt;

  const fields = patient.visitDetails || {
    chiefComplaint: "", medicalHistory: "", medications: "", allergies: "", notes: "",
  };
  const authors = patient.visitDetailsAuthors || {};

  const reasonsLegacy = Array.isArray(patient.visitReason)
    ? patient.visitReason
    : (patient.visitReason ? [patient.visitReason] : []);
  const visitReason = Array.isArray(fields.visitReason) && fields.visitReason.length
    ? fields.visitReason
    : reasonsLegacy;

  // Receptionist-edit attribution
  const setField = (k, v) => onUpdate({
    ...patient,
    visitDetails: { ...fields, visitReason, [k]: v },
    visitDetailsAuthors: { ...authors, [k]: "nurse" },
  });

  const [filling, setFilling] = useState(false); // "Fill on behalf of patient" mode
  const [refreshing, setRefreshing] = useState(false);

  // === 5 patient-intake sections ===
  const sections = [
    {
      key: "visitReason",
      labelKey: "vd.visitReason",
      icon: I.AlertCircle,
      filled: visitReason.length > 0,
      preview: visitReason.join(" · "),
    },
    {
      key: "chiefComplaint",
      labelKey: "vd.chiefComplaint",
      icon: I.User,
      filled: !!(fields.chiefComplaint || "").trim(),
      preview: fields.chiefComplaint,
    },
    {
      key: "medicalHistory",
      labelKey: "vd.medicalHistory",
      icon: I.FileText,
      filled: !!(fields.medicalHistory || "").trim(),
      preview: fields.medicalHistory,
    },
    {
      key: "medications",
      labelKey: "vd.medications",
      icon: I.FlaskConical,
      filled: !!(fields.medications || "").trim(),
      preview: fields.medications,
    },
    {
      key: "allergies",
      labelKey: "vd.allergies",
      icon: I.Sparkles,
      filled: !!(fields.allergies || "").trim(),
      preview: fields.allergies,
    },
  ];
  const filledCount = sections.filter(s => s.filled).length;
  const totalCount = sections.length;
  const allComplete = filledCount === totalCount;

  // === Header status pill (Figma: orange "Waiting for patient") ===
  const status = allComplete
    ? { tone: "success", labelKey: "vd.status.complete", Ico: I.CheckCircle }
    : filling
      ? { tone: "info", labelKey: "vd.status.filling", Ico: I.Edit }
      : pwaSent
        ? (filledCount > 0
            ? { tone: "warn", labelKey: "vd.status.inProgress", Ico: I.Clock }
            : { tone: "warn", labelKey: "vd.status.waiting", Ico: I.Clock })
        : { tone: "muted", labelKey: "vd.status.notStarted", Ico: I.Clock };
  const StatusIco = status.Ico;

  const refreshStatus = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const headerSubKey = filling
    ? "vd.subFilling"
    : allComplete
      ? "vd.subComplete"
      : "vd.subPatientCompletes";

  return (
    <div className="card vd-card">
      {/* === Header === */}
      <div className="card-head vd-head">
        <div className="vd-head-left">
          <h2>{t("vd.title")}</h2>
          <div className="vd-head-sub">
            <span>{t(headerSubKey)}</span>
            <span className={"vd-status-pill vd-status-" + status.tone}>
              <StatusIco size={10} /> {t(status.labelKey)}
            </span>
          </div>
        </div>
        <div className="vd-head-actions">
          {/* v9 §6 — Header is minimal. Send-intake / Fill-on-behalf / kebab
             are removed; the same actions live inside the card body (hero).
             Resend + Edit only appear AFTER the link has been sent (Round 9).
             In fill mode, the Done CTA is the only action visible here. */}
          {filling ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setFilling(false)}
            >
              <I.Check size={12} /> {t("vd.done")}
            </button>
          ) : (
            !allComplete && pwaSent && (
              <>
                <DisabledTooltip
                  disabled={!channelReady}
                  title={t("disabled.intake.title")}
                  reasons={[t("disabled.intake.channel")]}
                >
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={onSendToPhone}
                    disabled={!channelReady}
                    title={t("vd.resend")}
                  >
                    <I.RefreshCw size={12} /> {t("vd.resend")}
                  </button>
                </DisabledTooltip>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilling(true)}
                  title={t("vd.editFields")}
                >
                  <I.Edit size={12} /> {t("vd.editFields")}
                </button>
              </>
            )
          )}
        </div>
      </div>

      {/* === Hero card — only when intake hasn't been completed/filled === */}
      {!filling && !allComplete && (
        <div className="card-pad vd-pad">
          <div className="vd-hero">
            <div className="vd-hero-illust" aria-hidden="true">
              <PhoneIntakeIllustration />
            </div>
            <div className="vd-hero-copy">
              <div className="vd-hero-title">{t("vd.heroTitle")}</div>
              <div className="vd-hero-body">{t("vd.heroBody")}</div>
              <div className="vd-hero-aside">{t("vd.heroAside")}</div>
            </div>
            <div className="vd-hero-divider" aria-hidden="true" />
            <div className="vd-hero-cta">
              <div className="vd-hero-ready">{pwaSent ? t("vd.heroSentTo") : t("vd.heroReady")}</div>
              <div className="vd-hero-channel">
                {channelReady ? (
                  <>
                    <I.CheckCircle size={13} style={{ color: "var(--success-500)" }} />
                    <span className="vd-hero-channel-label">{channel.label}</span>
                    <span className="vd-hero-channel-target">{channel.target}</span>
                    <span className="vd-hero-channel-verified">
                      <span className="vd-hero-dot" /> {t("vd.verified")}
                    </span>
                  </>
                ) : (
                  <>
                    <I.AlertCircle size={13} style={{ color: "var(--warn-500)" }} />
                    <span style={{ color: "var(--warn-600)", fontWeight: 600 }}>{t("vd.channelMissing")}</span>
                  </>
                )}
              </div>
              <DisabledTooltip
                disabled={!channelReady}
                title={t("disabled.intake.title")}
                reasons={[t("disabled.intake.channel")]}
              >
                <button
                  className="btn btn-primary vd-hero-send"
                  onClick={onSendToPhone}
                  disabled={!channelReady}
                >
                  {sentFlash
                    ? (<><I.Check size={14} /> {t("vd.sentShort")}</>)
                    : (<><I.Send size={14} /> {pwaSent ? t("vd.heroResend") : t("vd.heroSendCta")}</>)}
                </button>
              </DisabledTooltip>
              <div className="vd-hero-or"><span>{t("vd.or")}</span></div>
              <button
                type="button"
                className="vd-hero-fillonbehalf"
                onClick={() => setFilling(true)}
              >
                <I.User size={12} /> {t("vd.fillOnBehalf")}
              </button>
            </div>
          </div>

          {/* Soft info banner */}
          <div className="vd-info-banner">
            <I.Info size={13} />
            <span>
              {t("vd.banner.before")}
              {" "}
              <button type="button" className="vd-info-link" onClick={() => setFilling(true)}>
                {t("vd.banner.link")}
              </button>
              {" "}
              {t("vd.banner.after")}
            </span>
          </div>
        </div>
      )}

      {/* === FILLING (nurse fills on behalf) — inline editable form === */}
      {filling && (
        <div className="card-pad vd-pad">
          <div className="vd-fill-banner">
            <I.User size={13} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="vd-fill-banner-title">{t("vd.fillBannerTitle")}</div>
              <div className="vd-fill-banner-body">{t("vd.fillBannerBody")}</div>
            </div>
          </div>

          <div className="vd-fill-grid">
            {/* Visit reason — multi-pill picker */}
            <div className="vd-fill-field">
              <label className="vd-fill-label">
                {t("vd.visitReason")} <span className="req">*</span>
              </label>
              <VisitReasonPills
                value={visitReason}
                onChange={v => setField("visitReason", v)}
                options={VISIT_REASON_KEYS.map((key, i) => ({ value: VISIT_REASONS[i], label: t(key), popular: VISIT_REASON_POPULAR.has(key) }))}
                placeholder={t("checkin.visitReason.placeholder")}
              />
            </div>
            {[
              { key: "chiefComplaint", labelKey: "vd.chiefComplaint", placeholderKey: "vd.chiefComplaint.placeholder", multiline: true },
              { key: "medicalHistory", labelKey: "vd.medicalHistory", placeholderKey: "vd.medicalHistory.placeholder", multiline: true },
              { key: "medications",    labelKey: "vd.medications",    placeholderKey: "vd.medications.placeholder",    multiline: false },
              { key: "allergies",      labelKey: "vd.allergies",      placeholderKey: "vd.allergies.placeholder",      multiline: false },
            ].map(f => (
              <div key={f.key} className="vd-fill-field">
                <label className="vd-fill-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {t(f.labelKey)}
                  {authors[f.key] && (fields[f.key] || "").trim() && <AuthorBadge who={authors[f.key]} t={t} />}
                </label>
                {f.multiline ? (
                  <textarea
                    className="input"
                    value={fields[f.key] || ""}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={t(f.placeholderKey)}
                    rows={2}
                    style={{ resize: "vertical", minHeight: 56, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.4, height: "auto" }}
                  />
                ) : (
                  <input
                    className="input"
                    value={fields[f.key] || ""}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={t(f.placeholderKey)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Intake progress ===
         v9 §5 — When the nurse is filling on behalf of the patient, the
         live PWA-status feed is meaningless. Hide it to reduce cognitive load.
         Mode indicator + form fields are the only things the nurse needs. */}
      {!filling && (
      <div className="card-pad vd-pad" style={{ paddingTop: 0 }}>
        <div className="vd-progress-card">
          <div className="vd-progress-head">
            <div className="vd-progress-head-left">
              <div className="vd-progress-ico"><I.ClipboardList size={16} /></div>
              <div>
                <div className="vd-progress-title">{t("vd.progress.title")}</div>
                <div className="vd-progress-sub">
                  {t("vd.progress.count", { filled: filledCount, total: totalCount })}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm vd-progress-refresh"
              onClick={refreshStatus}
              disabled={refreshing}
              title={t("vd.progress.refresh")}
            >
              <I.RefreshCw size={11} className={refreshing ? "vd-spinning" : ""} />
              {t("vd.progress.refresh")}
            </button>
          </div>
          <ul className="vd-progress-list">
            {sections.map(s => {
              const Ico = s.icon;
              return (
                <li key={s.key} className={"vd-progress-row" + (s.filled ? " filled" : "")}>
                  <div className="vd-progress-row-ico"><Ico size={14} /></div>
                  <div className="vd-progress-row-main">
                    <div className="vd-progress-row-label">{t(s.labelKey)}</div>
                    {s.filled && s.preview && (
                      <div className="vd-progress-row-preview">{s.preview}</div>
                    )}
                  </div>
                  <span className={"vd-progress-pill " + (s.filled ? "vd-progress-pill-done" : "vd-progress-pill-pending")}>
                    {s.filled
                      ? (<><I.Check size={9} strokeWidth={3} /> {t("vd.progress.received")}</>)
                      : (<><I.Clock size={9} /> {t("vd.progress.pending")}</>)}
                  </span>
                  <I.ChevronRight size={13} className="vd-progress-row-chev" />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      )}

      <div className="vd-foot">
        <I.Lock size={11} /> <span>{t("vd.foot.secure")}</span>
      </div>
    </div>
  );
}

// === Phone-with-paper-plane illustration (matches Figma 185:14415) ===
function PhoneIntakeIllustration() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Patient intake form"
    >
      {/* Sparkles */}
      <g stroke="var(--brand-300, #b0d4ff)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M14 22 l3 0 M15.5 20.5 l0 3" />
        <path d="M82 18 l2.4 0 M83.2 16.8 l0 2.4" />
        <path d="M76 78 l2.6 0 M77.3 76.7 l0 2.6" />
        <path d="M22 76 l2 0 M23 75 l0 2" />
      </g>
      {/* Phone */}
      <rect x="20" y="14" width="32" height="62" rx="6" stroke="var(--brand-500, #2087d6)" strokeWidth="1.6" fill="white" />
      <rect x="24" y="22" width="24" height="42" rx="3" stroke="var(--brand-200, #c6e2ff)" strokeWidth="1" fill="var(--brand-50, #f1f7ff)" />
      <circle cx="36" cy="71" r="2" stroke="var(--brand-500, #2087d6)" strokeWidth="1.4" fill="white" />
      {/* Inner circle (loading mark) */}
      <circle cx="36" cy="40" r="6.5" stroke="var(--brand-500, #2087d6)" strokeWidth="1.6" />
      <circle cx="36" cy="40" r="1.6" fill="var(--brand-500, #2087d6)" />
      {/* Paper plane */}
      <g transform="translate(50 38) rotate(-12)">
        <path
          d="M0 14 L34 0 L24 16 L14 11 L24 16 L20 28 Z"
          fill="var(--brand-500, #2087d6)"
          stroke="var(--brand-600, #1567b1)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M14 11 L24 16" stroke="var(--brand-200, #c6e2ff)" strokeWidth="1" />
      </g>
    </svg>
  );
}

// ============================================================
// LAB TESTS — always-open catalogue, search + categories,
//             no "Added" strip, with "Clear all" button
// ============================================================
export function LabTests({ patient, onUpdate }) {
  const t = useLang();
  const tests = patient.labTests || [];
  const [category, setCategory] = useState("Popular");
  const [query, setQuery] = useState("");
  const [justAdded, setJustAdded] = useState(null);

  const usedIds = new Set(tests.map(x => x.id));
  const matches = LAB_CATALOG.filter(c => {
    if (query) return c.name.toLowerCase().includes(query.toLowerCase());
    if (category === "Popular") return c.popular;
    return c.category === category;
  });

  const totalAdded = tests.reduce((s, x) => s + (x.price || 0), 0);

  const toggle = (c) => {
    if (usedIds.has(c.id)) {
      onUpdate({ ...patient, labTests: tests.filter(x => x.id !== c.id) });
      return;
    }
    onUpdate({ ...patient, labTests: [...tests, { id: c.id, name: c.name, price: c.price, status: "pending" }] });
    setJustAdded(c.id);
    setTimeout(() => setJustAdded(prev => prev === c.id ? null : prev), 800);
  };

  const clearAll = () => onUpdate({ ...patient, labTests: [] });

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>{t("lab.title")}</h2>
          <div className="sub">
            {tests.length === 0
              ? t("lab.subEmpty")
              : t("lab.subSummary", { n: tests.length, total: "$" + totalAdded.toFixed(2) })}
          </div>
        </div>
        {tests.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ color: "var(--danger-600)" }} title={t("lab.clearAll")}>
            <I.Trash size={12} /> {t("lab.clearAll")}
          </button>
        )}
      </div>

      <div className="card-pad" style={{ paddingTop: 4, paddingBottom: 0 }}>
        <div className="lab-search">
          <I.Search size={14} className="lab-search-ico" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("lab.searchPlaceholder")}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="lab-search-clear" title={t("lab.clear")}>
              <I.X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {!query && (
          <div className="lab-pills">
            {LAB_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={"lab-pill" + (category === cat ? " active" : "")}
              >
                {t("lab.cat." + cat.toLowerCase()) || cat}
              </button>
            ))}
          </div>
        )}

        <div className="lab-list">
          {matches.length === 0 ? (
            <div className="lab-empty">
              {query ? t("lab.noMatch", { q: query }) : t("lab.noTests")}
            </div>
          ) : matches.map((c, i) => {
            const added = usedIds.has(c.id);
            const flashing = justAdded === c.id;
            return (
              <div
                key={c.id}
                className={"lab-row" + (added ? " added" : "") + (flashing ? " flashing" : "")}
                style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
              >
                <span className="lab-name">{c.name}</span>
                <span className="lab-price">${c.price.toFixed(2)}</span>
                <button
                  onClick={() => toggle(c)}
                  className={"lab-toggle" + (added ? " is-added" : "")}
                  title={added ? t("lab.remove") : t("lab.add")}
                >
                  {added
                    ? <I.Check size={14} strokeWidth={2.5} />
                    : <I.Plus size={14} strokeWidth={2.5} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height: "var(--card-pad)" }} />
    </div>
  );
}

// ============================================================
// INSURANCE — provider scan/manual, multi-policy, fuzzy name match
// ============================================================
export function Insurance({ patient, onUpdate }) {
  const t = useLang();
  const policies = patient.insurance || [];
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const editingPolicy = editId ? policies.find(p => p.id === editId) : null;

  const save = (policy) => {
    if (policy.id) {
      onUpdate({ ...patient, insurance: policies.map(p => p.id === policy.id ? policy : p) });
    } else {
      onUpdate({ ...patient, insurance: [...policies, { ...policy, id: "ins-" + Date.now() }] });
    }
    setAdding(false); setEditId(null);
  };
  const cancel = () => { setAdding(false); setEditId(null); };

  return (
    <div className="card">
      <div className="card-head">
        <div><h2>{t("ins.title")}</h2></div>
        {!adding && !editId && (
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)} style={{ color: "var(--brand-600)" }}>
            <I.Plus size={13} /> {t("ins.add")}
          </button>
        )}
      </div>
      <div className="card-pad" style={{ paddingTop: 4, paddingBottom: 0 }}>
        {policies.length === 0 && !adding && (
          <div className="ins-empty">{t("ins.empty")}</div>
        )}
        {policies.length > 0 && !editingPolicy && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: adding ? 12 : 0 }}>
            {policies.map(p => (
              <PolicyRow key={p.id} policy={p} patient={patient} onEdit={() => setEditId(p.id)} t={t} />
            ))}
          </div>
        )}
        {(adding || editingPolicy) && (
          <InsuranceForm initial={editingPolicy} patient={patient} onSave={save} onCancel={cancel} t={t} />
        )}
      </div>
      <div style={{ height: "var(--card-pad)" }} />
    </div>
  );
}

function PolicyRow({ policy, patient, onEdit, t }) {
  // Fuzzy match score against the patient's name
  const score = patient ? fuzzyNameScore(policy.memberName, patient.name) : 1;
  const pct = Math.round(score * 100);
  const isFamily = !!policy.familyPlan;
  const matchOk = score >= 0.9 || isFamily;
  const relationKey = `ins.relation.${policy.relation || "self"}`;

  return (
    <div className="ins-policy">
      <div className="ins-policy-icon"><I.Shield size={16} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ins-policy-name">{policy.provider}</div>
        <div className="ins-policy-meta">
          {t("ins.policyShort")} #{policy.policyNumber} · {t("ins.member")}: {policy.memberName} · {t("ins.exp")}: {policy.expiry}
        </div>
        <div className="ins-policy-tags">
          <span className="ins-tag">{policy.coverage || "Outpatient"}</span>
          {/* Match badge */}
          {patient && (
            isFamily ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                color: "var(--brand-700)", background: "var(--brand-50)",
                border: "1px solid var(--brand-200)",
                padding: "1px 6px", borderRadius: 4,
                fontSize: 10, fontWeight: 600,
              }} title={t("ins.match.familyOk", { relation: t(relationKey) })}>
                <I.Users size={10} /> {t("ins.familyPlan")} · {t(relationKey)}
              </span>
            ) : (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                color: matchOk ? "var(--success-600)" : "var(--warn-600)",
                background: matchOk ? "var(--success-50)" : "var(--warn-50)",
                border: "1px solid " + (matchOk ? "var(--success-500)" : "var(--warn-500)"),
                padding: "1px 6px", borderRadius: 4,
                fontSize: 10, fontWeight: 600,
              }} title={matchOk ? t("ins.match.ok", { pct }) : t("ins.match.warn", { pct })}>
                {matchOk ? <I.Check size={10} strokeWidth={3} /> : <I.AlertTriangle size={10} />}
                {pct}% match
              </span>
            )
          )}
          <span style={{ color: policy.cardAttached ? "var(--success-700)" : "var(--ink-400)", display: "inline-flex", alignItems: "center", gap: 3 }}>
            {policy.cardAttached
              ? (<><I.Paperclip size={11} /> {t("ins.cardAttached")}</>)
              : (<><I.Image size={11} /> {t("ins.noCard")}</>)}
          </span>
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onEdit} style={{ flexShrink: 0 }}>
        <I.Edit size={11} /> {t("vd.edit")}
      </button>
    </div>
  );
}

function InsuranceForm({ initial, patient, onSave, onCancel, t }) {
  const [provider, setProvider] = useState(initial?.provider || "");
  const [policyNumber, setPolicyNumber] = useState(initial?.policyNumber || "");
  const [memberName, setMemberName] = useState(initial?.memberName || "");
  const [memberId, setMemberId] = useState(initial?.memberId || "");
  const [expiry, setExpiry] = useState(initial?.expiry || "");
  const [coverage, setCoverage] = useState(initial?.coverage || "Outpatient");
  const [cardAttached, setCardAttached] = useState(!!initial?.cardAttached);
  const [familyPlan, setFamilyPlan] = useState(!!initial?.familyPlan);
  const [relation, setRelation] = useState(initial?.relation || "self");
  const [moreOpen, setMoreOpen] = useState(false);
  const [groupName, setGroupName] = useState(initial?.groupName || "");
  const [copay, setCopay] = useState(initial?.copay || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [showManual, setShowManual] = useState(!!initial);
  const [scanning, setScanning] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerQuery, setProviderQuery] = useState("");
  const providerRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (providerRef.current && !providerRef.current.contains(e.target)) setProviderOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const scan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); setCardAttached(true); setShowManual(true); }, 1100);
  };

  // === Live fuzzy match (debounced via memo) ===
  const matchScore = useMemo(() => {
    if (!memberName || !patient?.name) return null;
    return fuzzyNameScore(memberName, patient.name);
  }, [memberName, patient?.name]);
  const matchPct = matchScore == null ? null : Math.round(matchScore * 100);
  const matchOk = matchScore != null && matchScore >= 0.9;
  const matchWarn = matchScore != null && matchScore < 0.9 && memberName.length > 1;
  // Auto-suggest family plan when names diverge
  useEffect(() => {
    if (matchWarn && !familyPlan && !initial?.familyPlan) {
      // do not auto-toggle — but the warning surfaces & nudges
    }
  }, [matchWarn]);

  // All required fields filled.
  const valid = provider && policyNumber && memberName && memberId && expiry;
  // Soft warning (does NOT block save) when name mismatches and no family flag.
  const needsFamilyAck = matchWarn && !familyPlan;
  const submit = () => {
    if (!valid) return;
    onSave({ id: initial?.id, provider, policyNumber, memberName, memberId, expiry, coverage, cardAttached, familyPlan, relation: familyPlan ? relation : "self", groupName, copay, notes });
  };

  const filteredProviders = INSURANCE_PROVIDERS.filter(p => !providerQuery || p.toLowerCase().includes(providerQuery.toLowerCase()));

  return (
    <div className="ins-form">
      {!initial && !showManual && (
        <div className="ins-scan-card">
          <div className="row" style={{ gap: 12 }}>
            <div className={"ins-scan-ico" + (cardAttached ? " ok" : "")}>
              {cardAttached ? <I.Check size={16} strokeWidth={2.5} /> : <I.CreditCard size={16} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ins-scan-title">{t("ins.cardTitle")}</div>
              <div className="ins-scan-sub">{cardAttached ? t("ins.cardAttachedSub") : t("ins.cardSub")}</div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={scan} disabled={scanning || cardAttached} style={{ width: "100%", justifyContent: "center", height: 36, fontSize: 12.5 }}>
            {scanning ? (<><span className="spinner" /> {t("ins.scanning")}</>)
              : cardAttached ? (<><I.Check size={14} /> {t("ins.cardAttached")}</>)
                : (<><I.Camera size={14} /> {t("ins.scanPhoto")}</>)}
          </button>
          <button type="button" onClick={() => setShowManual(true)} className="ins-manual-link">
            {t("ins.manual")} <I.ChevronRight size={12} />
          </button>
        </div>
      )}

      {(showManual || initial) && (
        <>
          {cardAttached && (
            <div className="ins-attached-tag">
              <I.Paperclip size={11} /> {t("ins.photoAttached")}
            </div>
          )}

          <div className="field" style={{ marginBottom: 10 }}>
            <label className="label">{t("ins.provider")} <span className="req">*</span></label>
            <div ref={providerRef} style={{ position: "relative" }}>
              <input className="input" value={provider}
                onChange={e => { setProvider(e.target.value); setProviderQuery(e.target.value); setProviderOpen(true); }}
                onFocus={() => setProviderOpen(true)}
                placeholder={t("ins.providerPlaceholder")} />
              <I.ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)", pointerEvents: "none" }} />
              {providerOpen && filteredProviders.length > 0 && (
                <div className="ins-provider-pop">
                  {filteredProviders.map(p => (
                    <div key={p} onClick={() => { setProvider(p); setProviderOpen(false); setProviderQuery(""); }}
                      className="ins-provider-item">
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">{t("ins.policyNumber")} <span className="req">*</span></label>
              <input className="input" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} placeholder="FT-00123456" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">{t("ins.memberId")} <span className="req">*</span></label>
              <input className="input" value={memberId} onChange={e => setMemberId(e.target.value)} placeholder="M-1234567" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {t("ins.memberName")} <span className="req">*</span>
                {matchPct != null && memberName.length > 1 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 9.5, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                    color: matchOk ? "var(--success-600)" : "var(--warn-600)",
                    background: matchOk ? "var(--success-50)" : "var(--warn-50)",
                    border: "1px solid " + (matchOk ? "var(--success-500)" : "var(--warn-500)"),
                    textTransform: "none", letterSpacing: 0,
                  }}>
                    {matchOk ? <I.Check size={9} strokeWidth={3} /> : <I.AlertTriangle size={9} />} {matchPct}%
                  </span>
                )}
              </label>
              <input className={"input" + (matchWarn && !familyPlan ? " invalid" : "")} value={memberName} onChange={e => setMemberName(e.target.value)} placeholder={t("ins.memberNamePlaceholder")} />
              {matchWarn && !familyPlan && (
                <div className="help" style={{ color: "var(--warn-600)", fontSize: 11, marginTop: 4, display: "flex", alignItems: "flex-start", gap: 4, lineHeight: 1.4 }}>
                  <I.AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{t("ins.match.warnBody")}</span>
                </div>
              )}
              {matchOk && (
                <div className="help" style={{ color: "var(--success-600)", fontSize: 11, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <I.Check size={11} strokeWidth={3} /> {t("ins.match.ok", { pct: matchPct })}
                </div>
              )}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">{t("ins.expiry")} <span className="req">*</span></label>
              <DateInput value={expiry} onChange={setExpiry} format="MM/YYYY" />
            </div>
          </div>

          {/* Family plan toggle + relation */}
          <div style={{
            marginBottom: 10,
            padding: "8px 10px",
            background: familyPlan ? "var(--brand-50)" : "var(--surface-2)",
            border: "1px solid " + (familyPlan ? "var(--brand-200)" : "var(--border)"),
            borderRadius: 7,
          }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={familyPlan}
                onChange={e => setFamilyPlan(e.target.checked)}
                style={{ marginTop: 2, accentColor: "var(--brand-500)" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 650, color: "var(--ink-900)" }}>
                  <I.Users size={12} /> {t("ins.familyPlan")}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-600)", marginTop: 1 }}>
                  {t("ins.familyPlan.sub")}
                </div>
              </div>
            </label>
            {familyPlan && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border-strong)" }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-600)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {t("ins.familyPlan.relation")}
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {["self", "spouse", "child", "parent", "other"].map(r => {
                    const active = relation === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRelation(r)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 5,
                          border: "1px solid " + (active ? "var(--brand-500)" : "var(--border-strong)"),
                          background: active ? "var(--brand-500)" : "var(--surface)",
                          color: active ? "white" : "var(--ink-700)",
                          fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {t(`ins.relation.${r}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label className="label">{t("ins.coverage")}</label>
            <div className="ins-seg">
              {[
                { id: "Outpatient", labelKey: "ins.outpatient" },
                { id: "Inpatient",  labelKey: "ins.inpatient" },
                { id: "Both",       labelKey: "ins.both" },
              ].map(c => (
                <button key={c.id} type="button" onClick={() => setCoverage(c.id)}
                  className={"ins-seg-item" + (coverage === c.id ? " active" : "")}>
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => setMoreOpen(o => !o)} className="ins-more-link">
            {moreOpen ? <I.ChevronUp size={12} /> : <I.ChevronDown size={12} />}
            {moreOpen ? t("ins.hide") : t("ins.more")}
          </button>

          {moreOpen && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">{t("ins.group")}</label>
                <input className="input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder={t("ins.groupPlaceholder")} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">{t("ins.copay")}</label>
                <input className="input" value={copay} onChange={e => setCopay(e.target.value)} placeholder="$5.00" />
              </div>
              <div className="field" style={{ marginBottom: 0, gridColumn: "span 2" }}>
                <label className="label">{t("ins.notes")}</label>
                <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder={t("ins.notesPlaceholder")}
                  style={{ resize: "vertical", minHeight: 50, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.4, height: "auto" }} />
              </div>
            </div>
          )}

          <div className="ins-form-actions">
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>{t("modal.cancel")}</button>
            <button className="btn btn-primary btn-sm" onClick={submit} disabled={!valid} title={valid ? "" : t("ins.fillRequired")}>
              <I.Check size={13} /> {initial ? t("ins.saveChanges") : t("ins.savePolicy")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// PRIOR RESULTS — gated reorder (sensitive results require fresh OTP)
// Round 10 #1 — checkbox multi-select + bulk add
// ============================================================
export function PriorResults({ patient, onUpdate, onAddToOrder, onPushToast }) {
  const t = useLang();
  const results = patient.priorResults || [];
  const [unlocked, setUnlocked] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState(null);
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState(() => new Set());

  // 5-minute expiry on unlock
  useEffect(() => {
    if (!unlocked || !unlockExpiresAt) return;
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, [unlocked, unlockExpiresAt]);
  const remaining = unlockExpiresAt ? Math.max(0, Math.round((unlockExpiresAt - Date.now()) / 1000)) : 0;
  useEffect(() => {
    if (unlocked && remaining === 0 && unlockExpiresAt) {
      setUnlocked(false); setOtpSent(false); setCode(""); setUnlockExpiresAt(null);
    }
  }, [tick]);

  const sensitive = results.some(r => r.sensitive);
  const sendOtp = () => {
    setOtpSent(true);
    onPushToast?.(t("reorder.otpSent"));
  };
  const verify = (val) => {
    setCode(val);
    if (val.length === 6) {
      if (val === "123456" || val === "000000") {
        setWrong(false);
        setUnlocked(true);
        setUnlockExpiresAt(Date.now() + 5 * 60 * 1000);
      } else {
        setWrong(true);
      }
    } else if (wrong) setWrong(false);
  };
  const reset = () => { setOtpSent(false); setCode(""); setWrong(false); setUnlocked(false); setUnlockExpiresAt(null); };

  if (results.length === 0) {
    return (
      <div className="card">
        <div className="card-head"><div><h2>{t("reorder.title")}</h2></div></div>
        <div className="card-pad" style={{ paddingTop: 4, color: "var(--ink-500)", fontSize: 12.5 }}>
          {t("reorder.empty")}
        </div>
        <div style={{ height: "var(--card-pad)" }} />
      </div>
    );
  }

  const lastVisit = results.reduce((acc, r) => (r.visitDate > acc ? r.visitDate : acc), "");

  // === Selectable rows = those visible to the user ===
  const selectableIds = results.filter(r => unlocked || !r.sensitive).map(r => r.id);
  const allChecked = selectableIds.length > 0 && selectableIds.every(id => picked.has(id));
  const noneChecked = picked.size === 0;

  const toggle = (id) => {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allChecked) {
      setPicked(new Set());
    } else {
      setPicked(new Set(selectableIds));
    }
  };
  const addSelected = () => {
    if (picked.size === 0) return;
    const chosen = results.filter(r => picked.has(r.id));
    onAddToOrder?.(chosen, { bulk: true });
    setPicked(new Set());
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>{t("reorder.title")}</h2>
          <p className="sub">{t("reorder.sub", { date: lastVisit })}</p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {selectableIds.length > 0 && (
            <button
              type="button"
              className="reorder-selectall"
              onClick={toggleAll}
              title={allChecked ? t("reorder.deselectAll") : t("reorder.selectAll")}
            >
              <span className={"reorder-checkbox" + (allChecked ? " checked" : "")}>
                {allChecked && <I.Check size={10} strokeWidth={3.5} />}
              </span>
              {allChecked ? t("reorder.deselectAll") : t("reorder.selectAll")}
            </button>
          )}
          {unlocked && (
            <>
              <span className="reorder-unlock-pill">
                <I.Unlock size={11} /> {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={reset}>
                <I.Lock size={11} /> {t("reorder.locked")}
              </button>
            </>
          )}
        </div>
      </div>

      {!unlocked && sensitive && (
        <div className="card-pad" style={{ paddingTop: 4, paddingBottom: 0 }}>
          <div style={{
            background: "var(--warn-50)",
            border: "1px solid var(--warn-500)",
            borderRadius: 8, padding: 12,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--warn-500)", color: "white",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <I.Lock size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 650, color: "var(--ink-900)" }}>
                  {t("reorder.gate")}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-700)", marginTop: 2, lineHeight: 1.45 }}>
                  {t("reorder.gateBody")}
                </div>
              </div>
            </div>
            {!otpSent ? (
              <button className="btn btn-primary btn-sm" onClick={sendOtp} style={{ height: 32, justifyContent: "center" }}>
                <I.Smartphone size={13} /> {t("reorder.sendOtp")}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <input
                  className={"input" + (wrong ? " invalid" : "")}
                  value={code}
                  onChange={e => verify(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("otp.enter")}
                  autoFocus
                  style={{ flex: 1, height: 32, letterSpacing: "0.15em", fontFamily: "'SF Mono', ui-monospace, monospace", textAlign: "center" }}
                />
                <button className="btn btn-ghost btn-sm" onClick={sendOtp} style={{ height: 32 }} title={t("otp.resend")}>
                  <I.RefreshCw size={11} />
                </button>
              </div>
            )}
            {wrong && (
              <div style={{ fontSize: 11, color: "var(--danger-500)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <I.AlertCircle size={11} /> {t("otp.incorrect")}
              </div>
            )}
            {otpSent && !wrong && (
              <div style={{ fontSize: 11, color: "var(--ink-500)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <I.Send size={11} /> {t("reorder.otpSent")}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card-pad" style={{ paddingTop: unlocked || !sensitive ? 4 : 12, paddingBottom: 0 }}>
        <div className="reorder-list">
          {results.map(r => {
            const showSensitive = unlocked || !r.sensitive;
            const isPicked = picked.has(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => showSensitive && toggle(r.id)}
                disabled={!showSensitive}
                className={"reorder-row" + (isPicked ? " picked" : "") + (!showSensitive ? " locked" : "")}
              >
                <span className={"reorder-checkbox" + (isPicked ? " checked" : "") + (!showSensitive ? " disabled" : "")}>
                  {isPicked && <I.Check size={10} strokeWidth={3.5} />}
                  {!showSensitive && <I.Lock size={9} />}
                </span>
                <div className="reorder-row-ico" style={{
                  background: showSensitive ? "var(--brand-50)" : "var(--ink-100)",
                  color: showSensitive ? "var(--brand-600)" : "var(--ink-400)",
                }}>
                  <I.FlaskConical size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div className="reorder-row-name" style={{
                    filter: showSensitive ? "none" : "blur(4px)",
                    userSelect: showSensitive ? "auto" : "none",
                  }}>
                    {r.testName}
                  </div>
                  <div className="reorder-row-meta">
                    {r.visitDate} · ${r.price.toFixed(2)}
                    {r.sensitive && (
                      <span style={{ marginLeft: 6, color: showSensitive ? "var(--success-600)" : "var(--warn-600)", fontWeight: 600 }}>
                        · {showSensitive ? t("reorder.unlocked") : t("reorder.locked")}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bulk-add CTA — disabled until at least 1 selected */}
        <button
          type="button"
          className="reorder-add-cta"
          onClick={addSelected}
          disabled={noneChecked}
          aria-disabled={noneChecked}
        >
          <I.Plus size={13} />
          {t("reorder.addSelected", { n: picked.size })}
        </button>
      </div>
      <div style={{ height: "var(--card-pad)" }} />
    </div>
  );
}

// ============================================================
// PAYMENT — USD/KHR toggle, KHQR + Cash, receipt
// ============================================================
const fmtUSD = (n) => "$" + n.toFixed(2);
const fmtKHR = (n) => "៛" + Math.round(n).toLocaleString();
const fmt = (n, ccy) => ccy === "KHR" ? fmtKHR(n) : fmtUSD(n);

export function Payment({ patient, onUpdate }) {
  const t = useLang();
  const [ccy, setCcy] = useState("USD");
  const [method, setMethod] = useState(null);
  const [khqrState, setKhqrState] = useState("waiting");
  const [tendered, setTendered] = useState("");
  const [drawerFlash, setDrawerFlash] = useState(false);
  const [paid, setPaid] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);

  const labsTotal = (patient.labTests || []).reduce((s, x) => s + (x.price || 0), 0);
  const amountDueUSD = VISIT_FEE + labsTotal;
  const amountDueDisplay = ccy === "KHR" ? amountDueUSD * KHR_RATE : amountDueUSD;
  const tenderedNum = parseFloat(tendered) || 0;
  const tenderedUSD = ccy === "KHR" ? tenderedNum / KHR_RATE : tenderedNum;
  const changeUSD = tenderedUSD - amountDueUSD;
  const changeDisplay = ccy === "KHR" ? changeUSD * KHR_RATE : changeUSD;

  const switchCcy = () => {
    const next = ccy === "USD" ? "KHR" : "USD";
    if (tendered) {
      const num = parseFloat(tendered) || 0;
      const converted = next === "KHR" ? num * KHR_RATE : num / KHR_RATE;
      setTendered(next === "KHR" ? Math.round(converted).toString() : converted.toFixed(2));
    }
    setCcy(next);
  };

  useEffect(() => {
    if (method === "khqr" && khqrState === "waiting" && !paid) {
      const tid = setTimeout(() => setKhqrState("paid"), 4500);
      return () => clearTimeout(tid);
    }
  }, [method, khqrState, paid]);
  useEffect(() => {
    if (khqrState === "paid" && method === "khqr") {
      const tid = setTimeout(() => setPaid(true), 800);
      return () => clearTimeout(tid);
    }
  }, [khqrState, method]);

  const popDrawer = () => { playDrawerDing(); setDrawerFlash(true); setTimeout(() => setDrawerFlash(false), 2000); };
  const confirmCash = () => { if (tenderedUSD >= amountDueUSD) { playDrawerDing(); setPaid(true); } };
  const reset = () => { setMethod(null); setKhqrState("waiting"); setTendered(""); setPaid(false); setReceiptSent(false); };

  if (paid) {
    const receiptId = "R-" + Math.floor(10000 + Math.random() * 90000);
    return (
      <div className="card">
        <div className="card-head">
          <div><h2>{t("pay.title")}</h2></div>
          <button className="btn btn-ghost btn-sm" onClick={reset}>
            <I.RefreshCw size={11} /> {t("pay.newTransaction")}
          </button>
        </div>
        <div className="card-pad" style={{ paddingTop: 4 }}>
          <div className="pay-confirmed">
            <div className="pay-confirmed-head">
              <div className="pay-confirmed-mark"><I.Check size={14} strokeWidth={3} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pay-confirmed-title">{t("pay.confirmed")}</div>
                <div className="pay-confirmed-time">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <dl className="pay-confirmed-grid">
              <div>
                <dt>{t("pay.amount")}</dt>
                <dd className="pay-confirmed-amount">{fmt(amountDueDisplay, ccy)}</dd>
              </div>
              <div>
                <dt>{t("pay.title")}</dt>
                <dd>{method === "khqr" ? "KHQR" : t("pay.cash")}</dd>
              </div>
              <div>
                <dt>{t("pay.receiptNo")}</dt>
                <dd className="mono">#{receiptId}</dd>
              </div>
              {method === "cash" && (
                <div>
                  <dt>{t("pay.change")}</dt>
                  <dd>{fmt(Math.max(0, changeDisplay), ccy)}</dd>
                </div>
              )}
            </dl>
            <div className="pay-confirmed-actions">
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                <I.Printer size={12} /> {t("pay.print")}
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setReceiptSent(true)} disabled={receiptSent}>
                {receiptSent ? (<><I.Check size={12} /> {t("vd.sentShort")}</>) : (<><I.Smartphone size={12} /> {t("pay.sendPhone")}</>)}
              </button>
            </div>
          </div>
        </div>
        <div style={{ height: "var(--card-pad)" }} />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <div><h2>{t("pay.title")}</h2></div>
        <button className="btn btn-ghost btn-sm" onClick={switchCcy}
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", fontVariantNumeric: "tabular-nums" }}
          title={t("pay.switchCcy")}>
          <span style={{ fontWeight: 700, color: "var(--ink-900)" }}>{ccy}</span>
          <I.ArrowLeftRight size={11} style={{ margin: "0 2px" }} />
          <span style={{ color: "var(--ink-500)" }}>{ccy === "USD" ? "KHR" : "USD"}</span>
        </button>
      </div>

      <div className="card-pad" style={{ paddingTop: 4, paddingBottom: 0 }}>
        <div className="pay-due">
          <div>
            <div className="pay-due-label">{t("pay.amountDue")}</div>
            <div className="pay-due-sub">
              {t("pay.visit")} ${VISIT_FEE.toFixed(2)} + {patient.labTests?.length || 0} {t("pay.labs")} ${labsTotal.toFixed(2)}
            </div>
          </div>
          <div className="pay-due-amount">{fmt(amountDueDisplay, ccy)}</div>
        </div>
        <div className="pay-rate">{t("pay.rate", { rate: KHR_RATE.toLocaleString() })}</div>

        <div className="pay-methods">
          <PayMethodCard active={method === "khqr"} onClick={() => setMethod("khqr")}
            title="KHQR" sub={t("pay.scanPay")} icon={<KHQRMini />} />
          <PayMethodCard active={method === "cash"} onClick={() => setMethod("cash")}
            title={t("pay.cash")} sub={t("pay.tenderedChange")}
            icon={<span style={{ fontSize: 24 }}>💵</span>} />
          <PayMethodCard disabled title={t("pay.card")} sub={t("pay.comingSoon")}
            icon={<I.CreditCard size={26} />} />
        </div>

        {method === "khqr" && (
          <div className="pay-khqr">
            <KHQRGraphic size={180} expired={khqrState === "expired"} paid={khqrState === "paid"} />
            <div className="pay-khqr-amount">{t("pay.amount")}: {fmt(amountDueDisplay, ccy)}</div>
            <div className="pay-khqr-state">
              {khqrState === "waiting" && (<><span className="pulseDot" /> {t("pay.waiting")}</>)}
              {khqrState === "paid" && (<><I.Check size={14} style={{ color: "var(--success-500)" }} /> <span style={{ color: "var(--success-700)", fontWeight: 600 }}>{t("pay.received")} — {fmt(amountDueDisplay, ccy)}</span></>)}
              {khqrState === "expired" && (<><I.AlertCircle size={13} style={{ color: "var(--warn-500)" }} /> <span style={{ color: "var(--warn-600)", fontWeight: 600 }}>{t("pay.expired")}</span></>)}
            </div>
            <button onClick={() => setKhqrState("waiting")} className="pay-khqr-regen">
              <I.RefreshCw size={11} /> {t("pay.regen")}
            </button>
          </div>
        )}

        {method === "cash" && (
          <div className="pay-cash">
            <div className="pay-cash-row">
              <span>{t("pay.amountDue")}</span>
              <span style={{ fontWeight: 700, color: "var(--ink-900)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{fmt(amountDueDisplay, ccy)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="label">{t("pay.tendered")}</label>
                <div className="input-wrap">
                  <span className="pay-tendered-sym">{ccy === "USD" ? "$" : "៛"}</span>
                  <input className="input" type="number" inputMode="decimal" placeholder="0.00"
                    value={tendered} onChange={e => setTendered(e.target.value)}
                    style={{ paddingLeft: 28, fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }} />
                </div>
              </div>
              <button className="btn btn-secondary" onClick={popDrawer}
                style={{ height: "var(--field-h)", whiteSpace: "nowrap" }}
                title={t("pay.openDrawer")}>
                {drawerFlash ? (<><I.Check size={13} /> {t("pay.drawerOpened")}</>) : (<><I.Inbox size={13} /> {t("pay.openDrawer")}</>)}
              </button>
            </div>
            <div className="pay-change">
              <span style={{ fontSize: 12.5, color: "var(--ink-700)", fontWeight: 600 }}>{t("pay.change")}</span>
              <span style={{
                fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                color: !tendered ? "var(--ink-400)" : changeUSD < 0 ? "var(--danger-500)" : "var(--success-600)",
              }}>
                {!tendered ? fmt(0, ccy)
                  : (changeUSD < 0 ? "−" : (changeUSD > 0 ? "+" : "")) + fmt(Math.abs(changeDisplay), ccy)}
              </span>
            </div>
            {tendered && changeUSD < 0 && (
              <div className="pay-underpaid">{t("pay.underpaid", { amount: fmt(Math.abs(changeDisplay), ccy) })}</div>
            )}
            <button className="btn btn-primary" onClick={confirmCash}
              disabled={!tendered || changeUSD < 0}
              style={{ width: "100%", marginTop: 14, height: 38, justifyContent: "center", fontSize: 13 }}>
              <I.Check size={14} /> {t("pay.confirmCash")}
            </button>
          </div>
        )}

        {!method && (
          <div className="pay-empty">{t("pay.pickMethod")}</div>
        )}
      </div>
      <div style={{ height: "var(--card-pad)" }} />
    </div>
  );
}

function PayMethodCard({ active, onClick, title, sub, icon, disabled }) {
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      className={"pay-method" + (active ? " active" : "") + (disabled ? " disabled" : "")}>
      <div className="pay-method-ico" style={{ color: active ? "var(--brand-600)" : "var(--ink-700)" }}>{icon}</div>
      <div className="pay-method-title" style={{ color: active ? "var(--brand-700)" : "var(--ink-900)" }}>{title}</div>
      <div className="pay-method-sub">{sub}</div>
    </button>
  );
}

function KHQRMini() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      <rect width="28" height="28" rx="3" fill="#0f1115" />
      <rect x="3" y="3" width="6" height="6" fill="white" />
      <rect x="19" y="3" width="6" height="6" fill="white" />
      <rect x="3" y="19" width="6" height="6" fill="white" />
      <rect x="11" y="11" width="2" height="2" fill="white" />
      <rect x="14" y="14" width="2" height="2" fill="white" />
      <rect x="17" y="11" width="2" height="2" fill="white" />
      <rect x="11" y="17" width="2" height="2" fill="white" />
    </svg>
  );
}

function KHQRGraphic({ size = 180, expired, paid }) {
  const cells = 21;
  const cellSize = size / cells;
  const pattern = useMemo(() => {
    const arr = [];
    let seed = 42;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let r = 0; r < cells; r++) {
      const row = [];
      for (let c = 0; c < cells; c++) {
        const inFinder = (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
        if (inFinder) { row.push(false); continue; }
        row.push(rand() > 0.5);
      }
      arr.push(row);
    }
    return arr;
  }, []);

  const Finder = ({ x, y }) => (
    <g transform={`translate(${x * cellSize}, ${y * cellSize})`}>
      <rect width={7 * cellSize} height={7 * cellSize} fill="#0f1115" />
      <rect x={cellSize} y={cellSize} width={5 * cellSize} height={5 * cellSize} fill="white" />
      <rect x={2 * cellSize} y={2 * cellSize} width={3 * cellSize} height={3 * cellSize} fill="#0f1115" />
    </g>
  );

  return (
    <div className="khqr-card" style={{ filter: expired ? "grayscale(0.8) opacity(0.5)" : paid ? "grayscale(1) opacity(0.4)" : "none" }}>
      <div className="khqr-head">KHQR</div>
      <svg width={size} height={size} style={{ display: "block" }}>
        <rect width={size} height={size} fill="white" />
        {pattern.map((row, r) =>
          row.map((on, c) => on ? (
            <rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#0f1115" />
          ) : null)
        )}
        <Finder x={0} y={0} />
        <Finder x={cells - 7} y={0} />
        <Finder x={0} y={cells - 7} />
        <g transform={`translate(${size/2 - 14}, ${size/2 - 14})`}>
          <rect width={28} height={28} rx={4} fill="white" stroke="#c8102e" strokeWidth={2} />
          <text x={14} y={19} textAnchor="middle" fontSize={11} fontWeight={800} fill="#c8102e">K</text>
        </g>
      </svg>
      <div className="khqr-foot">SCAN ME · BAKONG</div>
      {paid && (
        <div className="khqr-paid-overlay">
          <div className="khqr-paid-check"><I.Check size={32} strokeWidth={3.5} /></div>
        </div>
      )}
    </div>
  );
}
