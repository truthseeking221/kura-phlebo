// Left-column patient card with journey status. Shared across the two
// booth screens so the operator always knows where the patient sits in
// the visit sequence.

import { I } from "./icons";

function formatAge(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return `${age}y`;
}

function formatDob(dob) {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const JOURNEY_LABEL = {
  identity: "Identity",
  vitals:   "Vital Signs",
  phlebo:   "Phlebotomy",
};

const JOURNEY_ICON = {
  identity: "ShieldCheck",
  vitals:   "Heart",
  phlebo:   "FlaskConical",
};

const STATE_META = {
  done:    { tone: "success", label: "Done",     icon: "CheckCircle" },
  pending: { tone: "info",    label: "Pending",  icon: "Clock"        },
  waiting: { tone: "muted",   label: "Waiting",  icon: "Clock"        },
  skipped: { tone: "warn",    label: "Skipped",  icon: "AlertCircle" },
};

export function PatientCard({ patient, currentStep }) {
  if (!patient) return null;
  const StepIcon = (key) => I[JOURNEY_ICON[key]] || I.Check;
  const StateIcon = (key) => I[STATE_META[key]?.icon || "Clock"];

  return (
    <aside className="vp-patient-card">
      <div className="vp-pc-head">
        <div className={"avatar av-lg " + (patient.avatarColor || "av-blue")}>{patient.initials}</div>
        <div className="vp-pc-id">
          <div className="vp-pc-name">{patient.name}</div>
          <div className="vp-pc-meta">
            <span>{formatDob(patient.dob)}</span>
            <span>·</span>
            <span>{formatAge(patient.dob)}</span>
            <span>·</span>
            <span>{patient.sex}</span>
          </div>
          <div className="vp-pc-pid">
            <span className="vp-pc-pid-tag">PID</span>
            <span className="vp-pc-pid-val">{patient.pid}</span>
            <span className="vp-pc-dot" aria-hidden="true">·</span>
            <span className="vp-pc-order">Order {patient.orderId}</span>
          </div>
        </div>
      </div>

      {patient.allergies?.length > 0 && (
        <div className="vp-pc-allergies" role="note">
          <I.AlertTriangle size={13} />
          <span className="vp-pc-allergies-label">Allergies:</span>
          <span>{patient.allergies.join(", ")}</span>
        </div>
      )}

      <div className="vp-pc-journey">
        <div className="vp-pc-journey-title">Journey</div>
        <ul className="vp-pc-journey-list">
          {["identity", "vitals", "phlebo"].map(step => {
            const Sicon = StepIcon(step);
            const state = patient.journey?.[step] || "waiting";
            const meta = STATE_META[state] || STATE_META.waiting;
            const Sticon = StateIcon(state);
            const isCurrent = currentStep === step;
            return (
              <li
                key={step}
                className={"vp-pc-journey-item is-" + meta.tone + (isCurrent ? " is-current" : "")}
              >
                <span className="vp-pc-journey-icon"><Sicon size={14} /></span>
                <span className="vp-pc-journey-label">{JOURNEY_LABEL[step]}</span>
                <span className={"vp-pc-journey-state vp-tone-" + meta.tone}>
                  <Sticon size={12} />
                  <span>{meta.label}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="vp-pc-meta-grid">
        <div className="vp-pc-meta-cell">
          <div className="vp-pc-meta-cell-label">Check-in</div>
          <div className="vp-pc-meta-cell-val">{patient.checkInAt}</div>
        </div>
        <div className="vp-pc-meta-cell">
          <div className="vp-pc-meta-cell-label">Waiting</div>
          <div className={
            "vp-pc-meta-cell-val " +
            (patient.waitingMinutes > 60 ? "vp-tone-danger" :
             patient.waitingMinutes > 30 ? "vp-tone-warn" : "")
          }>
            {patient.waitingMinutes} min
          </div>
        </div>
        <div className="vp-pc-meta-cell">
          <div className="vp-pc-meta-cell-label">Fasting</div>
          <div className="vp-pc-meta-cell-val">{patient.fasting || "—"}</div>
        </div>
        <div className="vp-pc-meta-cell">
          <div className="vp-pc-meta-cell-label">Mobile</div>
          <div className="vp-pc-meta-cell-val vp-truncate">{patient.mobile || "—"}</div>
        </div>
      </div>
    </aside>
  );
}
