// Vital Signs form. Two rows of biometrics+vitals, an emoji VAS slider,
// fasting radio, optional vaccination textarea, and an out-of-range
// confirmation gate before Submit.

import { useState, useMemo, useEffect } from "react";
import { I } from "./icons";
import {
  emptyVitals, calcBMI, bmiCategory, VITAL_RANGES, FASTING_OPTIONS,
} from "./phleboData";

function fieldOOR(field, raw, tempUnit) {
  if (raw === "" || raw == null) return false;
  const v = parseFloat(raw);
  if (isNaN(v)) return false;
  if (field === "tempC" && tempUnit === "F") {
    // Convert F → C internally for range check.
    const c = (v - 32) * (5 / 9);
    const [lo, hi] = VITAL_RANGES.tempC;
    return c < lo || c > hi;
  }
  const range = VITAL_RANGES[field];
  if (!range) return false;
  return v < range[0] || v > range[1];
}

function rangeText(field, tempUnit) {
  const r = VITAL_RANGES[field];
  if (!r) return "";
  if (field === "tempC" && tempUnit === "F") {
    const fLo = (r[0] * 9) / 5 + 32;
    const fHi = (r[1] * 9) / 5 + 32;
    return `${fLo.toFixed(0)}–${fHi.toFixed(0)} °F`;
  }
  const unit = {
    heightCm: "cm", weightKg: "kg", hr: "bpm", bpSys: "mmHg", bpDia: "mmHg",
    tempC: "°C", spo2: "%", breathing: "/min",
  }[field] || "";
  return `${r[0]}–${r[1]} ${unit}`;
}

const PAIN_FACES = [
  { v: 0,  emoji: "😊", label: "No pain"    },
  { v: 2,  emoji: "🙂", label: "Mild"       },
  { v: 5,  emoji: "😐", label: "Moderate"   },
  { v: 7,  emoji: "😣", label: "Severe"     },
  { v: 10, emoji: "😭", label: "Worst"      },
];
function painFor(v) {
  let best = PAIN_FACES[0];
  for (const f of PAIN_FACES) if (Math.abs(v - f.v) < Math.abs(v - best.v)) best = f;
  return best;
}

function NumField({ field, label, unit, value, onChange, tempUnit, onTempUnitToggle, required, hint }) {
  const oor = fieldOOR(field, value, tempUnit);
  return (
    <label className={"vp-vf-field" + (oor ? " is-oor" : "")}>
      <span className="vp-vf-label">
        <span className="vp-vf-label-main">
          <span>{label}</span>
          {required && <span className="vp-req">*</span>}
        </span>
        <span className="vp-vf-range">{rangeText(field, tempUnit)}</span>
      </span>
      <span className="vp-vf-input-wrap">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step="any"
          aria-invalid={oor}
        />
        {unit && (
          field === "tempC" ? (
            <button
              type="button"
              className="vp-vf-unit-toggle"
              onClick={onTempUnitToggle}
              aria-label="Toggle temperature unit"
            >
              °{tempUnit}
            </button>
          ) : (
            <span className="vp-vf-unit">{unit}</span>
          )
        )}
        {oor && (
          <span className="vp-vf-warn" title="Outside typical range">
            <I.AlertTriangle size={13} />
          </span>
        )}
      </span>
      {hint && <span className="vp-vf-hint">{hint}</span>}
    </label>
  );
}

function BPField({ sys, dia, onSys, onDia, tempUnit }) {
  const oorSys = fieldOOR("bpSys", sys, tempUnit);
  const oorDia = fieldOOR("bpDia", dia, tempUnit);
  const oor = oorSys || oorDia;
  return (
    <div className={"vp-vf-field vp-vf-bp" + (oor ? " is-oor" : "")}>
      <span className="vp-vf-label">
        <span className="vp-vf-label-main">
          <span>Blood Pressure</span>
          <span className="vp-req">*</span>
        </span>
        <span className="vp-vf-range">{rangeText("bpSys")} / {rangeText("bpDia")}</span>
      </span>
      <span className="vp-vf-input-wrap vp-vf-bp-pair">
        <input type="number" value={sys} onChange={(e) => onSys(e.target.value)} placeholder="120" aria-label="Systolic" aria-invalid={oorSys} />
        <span className="vp-vf-bp-slash">/</span>
        <input type="number" value={dia} onChange={(e) => onDia(e.target.value)} placeholder="80" aria-label="Diastolic" aria-invalid={oorDia} />
        <span className="vp-vf-unit">mmHg</span>
        {oor && (
          <span className="vp-vf-warn" title="Outside typical range">
            <I.AlertTriangle size={13} />
          </span>
        )}
      </span>
    </div>
  );
}

export function VitalsForm({ patient, initial, onSubmit, onClear, onCancel }) {
  const [v, setV] = useState({ ...emptyVitals, ...(initial || {}) });
  const [confirmAbnormal, setConfirmAbnormal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Re-prefill when patient changes (operator scans next patient).
  useEffect(() => {
    setV({ ...emptyVitals, ...(initial || {}) });
    setConfirmAbnormal(false);
  }, [patient?.id, initial]);

  const set = (key) => (val) => setV(s => ({ ...s, [key]: val }));

  const bmi = useMemo(() => calcBMI(v.heightCm, v.weightKg), [v.heightCm, v.weightKg]);
  const bmiCat = bmiCategory(bmi);

  const oorFields = useMemo(() => {
    const out = [];
    for (const k of ["heightCm", "weightKg", "hr", "bpSys", "bpDia", "tempC", "spo2", "breathing"]) {
      if (fieldOOR(k, v[k], v.tempUnit)) out.push(k);
    }
    return out;
  }, [v]);
  const hasOOR = oorFields.length > 0;

  const requiredFilled = ["heightCm", "weightKg", "hr", "bpSys", "bpDia"].every(k => v[k] !== "" && v[k] != null);
  const canSubmit = requiredFilled && (!hasOOR || confirmAbnormal) && !submitting;

  const submit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    onSubmit?.(v);
    // Parent transitions us, but reset just in case.
    setTimeout(() => setSubmitting(false), 1500);
  };

  const pain = painFor(v.painVas);

  return (
    <section className="vp-vf">
      <header className="vp-vf-head">
        <div>
          <div className="vp-vf-eyebrow">Booth · Vital Signs</div>
          <h2 className="vp-vf-title">Record vital signs</h2>
        </div>
        <div className="vp-vf-head-meta">
          <span>{patient?.name}</span>
          <span>·</span>
          <span>PID {patient?.pid}</span>
        </div>
      </header>

      <div className="vp-vf-section">
        <div className="vp-vf-section-title">Biometrics</div>
        <div className="vp-vf-grid vp-vf-grid-3">
          <NumField field="heightCm" label="Height" unit="cm" value={v.heightCm} onChange={set("heightCm")} required />
          <NumField field="weightKg" label="Weight" unit="kg" value={v.weightKg} onChange={set("weightKg")} required />
          <div className="vp-vf-field vp-vf-bmi">
            <span className="vp-vf-label">BMI <span className="vp-vf-range">auto</span></span>
            <span className="vp-vf-input-wrap">
              <span className="vp-vf-bmi-val">{bmi != null ? bmi : "—"}</span>
              <span className="vp-vf-unit">kg/m²</span>
              {bmiCat && (
                <span className={"vp-pill vp-tone-" + bmiCat.tone + " vp-vf-bmi-pill"}>{bmiCat.label}</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="vp-vf-section">
        <div className="vp-vf-section-title">Vitals</div>
        <div className="vp-vf-grid vp-vf-grid-3">
          <NumField field="hr"        label="Heart Rate"     unit="bpm"   value={v.hr}        onChange={set("hr")}        required />
          <BPField sys={v.bpSys} dia={v.bpDia} onSys={set("bpSys")} onDia={set("bpDia")} tempUnit={v.tempUnit} />
          <NumField field="tempC"     label="Temperature"    unit="°C"    value={v.tempC}     onChange={set("tempC")}     tempUnit={v.tempUnit} onTempUnitToggle={() => setV(s => ({ ...s, tempUnit: s.tempUnit === "C" ? "F" : "C" }))} />
          <NumField field="spo2"      label="SpO₂"           unit="%"     value={v.spo2}      onChange={set("spo2")} />
          <NumField field="breathing" label="Breathing rate" unit="/min" value={v.breathing} onChange={set("breathing")} hint="Optional" />
        </div>
      </div>

      <div className="vp-vf-section">
        <div className="vp-vf-section-title">Pain (VAS 0–10)</div>
        <div className="vp-vf-vas">
          <div className="vp-vf-vas-face" aria-hidden="true">
            <span className="vp-vf-vas-emoji">{pain.emoji}</span>
            <span className="vp-vf-vas-tag">{pain.label}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={v.painVas}
            onChange={(e) => set("painVas")(parseInt(e.target.value, 10))}
            className="vp-vf-vas-slider"
            aria-label="Pain VAS"
          />
          <div className="vp-vf-vas-scale" aria-hidden="true">
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <span key={n} className={n === v.painVas ? "is-active" : ""}>{n}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="vp-vf-section">
        <div className="vp-vf-section-title">Fasting status</div>
        <div className="vp-vf-radio-row" role="radiogroup" aria-label="Fasting status">
          {FASTING_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={v.fasting === opt.id}
              className={"vp-vf-radio" + (v.fasting === opt.id ? " is-on" : "")}
              onClick={() => set("fasting")(opt.id)}
            >
              <span className="vp-vf-radio-dot" aria-hidden="true" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="vp-vf-section">
        <button
          type="button"
          className="vp-vf-collapse"
          onClick={() => set("vaccinationOpen")(!v.vaccinationOpen)}
          aria-expanded={v.vaccinationOpen}
        >
          <I.ChevronDown size={14} style={{ transform: v.vaccinationOpen ? "rotate(180deg)" : "" }} />
          <span>Vaccination (optional)</span>
        </button>
        {v.vaccinationOpen && (
          <textarea
            className="vp-vf-textarea"
            placeholder="Vaccine name, batch number, date administered…"
            value={v.vaccinationNote}
            onChange={(e) => set("vaccinationNote")(e.target.value)}
            rows={3}
          />
        )}
      </div>

      {hasOOR && (
        <div className="vp-vf-confirm">
          <label className="vp-vf-confirm-label">
            <input
              type="checkbox"
              checked={confirmAbnormal}
              onChange={(e) => setConfirmAbnormal(e.target.checked)}
            />
            <span>
              <strong>Confirm abnormal values.</strong>{" "}
              {oorFields.length} field{oorFields.length === 1 ? "" : "s"} outside typical range.
            </span>
          </label>
        </div>
      )}

      <footer className="vp-vf-actions">
        <button type="button" className="btn btn-ghost" onClick={onClear}>Clear form</button>
        <div className="vp-vf-actions-right">
          {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSubmit}
            onClick={submit}
          >
            {submitting ? "Saving…" : "Submit & next patient"}
            <I.ArrowRight size={14} />
          </button>
        </div>
      </footer>
    </section>
  );
}
