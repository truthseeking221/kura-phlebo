// === AI Inline Panel — Guided Orders woven into Step 4 ===
//
//   v2.1: dropped the right-side drawer. The AI section now lives inline at the
//   top of Step 4, above the catalogue. Reasons:
//   - A drawer interrupts the workflow; an inline panel is part of the page.
//   - Cart stays visible the whole time, so suggestions feel additive, not modal.
//   - The AI surface is calmer: tinted, no gradients, no purple, no shadow.
//     Its "AI"-ness comes from the sparkles glyph + the bucketed reasoning,
//     not from saturated decoration.
//
//   Default behaviour:
//   - If the patient has any high-confidence buckets, the panel is expanded.
//   - Otherwise it stays collapsed, showing only a one-line peek.
//   - User can expand/collapse manually; state persists per-mount.
//
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { I } from "./icons";
import { useLang } from "./i18n";
import { ORDER_CATALOG } from "./OrderCart";

// === Test reference info — shown in the expanded "why" so a nurse can ===
//    explain each test to the patient confidently. Keep wording plain so it
//    can be read out loud verbatim.
export const TEST_INFO = {
  cbc: {
    what: "Counts red cells, white cells and platelets in a single blood sample.",
    detect: "Infection, anemia, immune problems, low platelets.",
    sample: "Single blood draw · ~3 mL",
    prep: null,
    tat: "~2h",
    talkingPoints: [
      "Quick finger-stick or arm draw, no fasting needed.",
      "Most common screening lab — useful baseline if results haven't been recent.",
    ],
  },
  glucose: {
    what: "Measures fasting blood sugar at this moment in time.",
    detect: "Diabetes, pre-diabetes, hypoglycemia.",
    sample: "Single blood draw · ~1 mL",
    prep: "8-hour fasting (water is OK).",
    tat: "~1h",
    talkingPoints: [
      "Confirm last meal — if patient ate within 8h, reschedule the draw.",
      "Pair with HbA1c for a fuller picture if diabetes is suspected.",
    ],
  },
  lipid: {
    what: "Measures total cholesterol, LDL (bad), HDL (good) and triglycerides.",
    detect: "Cardiovascular risk, metabolic syndrome.",
    sample: "Single blood draw · ~3 mL",
    prep: "8-hour fasting · no alcohol for 24h before draw.",
    tat: "~2h",
    talkingPoints: [
      "Ask about alcohol in the last 24h — it skews triglycerides upward.",
      "Recommended yearly for adults 40+, every 6 months on lipid-lowering meds.",
    ],
  },
  hba1c: {
    what: "3-month average of blood sugar control (glycated hemoglobin).",
    detect: "Diabetes diagnosis and long-term control.",
    sample: "Single blood draw · ~2 mL",
    prep: "None — patient can eat normally.",
    tat: "~3h",
    talkingPoints: [
      "Reflects the last ~90 days, not just today — recent meals don't matter.",
      "≥6.5% = diabetic range; 5.7–6.4% = pre-diabetic.",
    ],
  },
  tsh: {
    what: "Thyroid Stimulating Hormone — first-line thyroid screen.",
    detect: "Hyperthyroidism, hypothyroidism, thyroid medication tuning.",
    sample: "Single blood draw · ~2 mL",
    prep: null,
    tat: "Same day",
    talkingPoints: [
      "Useful when patient reports fatigue, weight change, palpitations or cold/heat intolerance.",
      "If TSH is abnormal, doctor will usually add Free T4 reflexively.",
    ],
  },
  urinalysis: {
    what: "Chemical strip + microscopic look at a urine sample.",
    detect: "UTI, kidney problems, blood in urine, diabetes markers.",
    sample: "Mid-stream urine · ~30 mL cup",
    prep: "Avoid drinking large amounts of water 1h before sample.",
    tat: "~1h",
    talkingPoints: [
      "Quick and cheap — good companion to a kidney panel.",
      "If patient is menstruating, note it on the request — it can affect results.",
    ],
  },
  preg: {
    what: "Quantitative β-hCG — confirms and dates pregnancy.",
    detect: "Pregnancy (including very early), miscarriage risk, ectopic risk.",
    sample: "Blood draw · ~2 mL (urine option also available)",
    prep: null,
    tat: "~1h",
    talkingPoints: [
      "Blood β-hCG detects pregnancy a few days earlier than urine.",
      "Always offer privately — confirm with the patient before adding.",
    ],
  },
  lft: {
    what: "Liver enzymes (ALT, AST, GGT) plus bilirubin and albumin.",
    detect: "Hepatitis, fatty liver, drug toxicity, alcohol-related damage.",
    sample: "Single blood draw · ~3 mL",
    prep: "No alcohol for 24h before draw.",
    tat: "~2h",
    talkingPoints: [
      "Required at baseline and every 6–12 months for statin or anti-TB users.",
      "Confirm any over-the-counter painkillers — paracetamol can spike ALT.",
    ],
  },
  kft: {
    what: "Creatinine, urea and eGFR — measures kidney filtering capacity.",
    detect: "Kidney impairment, ACE-inhibitor safety, dehydration.",
    sample: "Single blood draw · ~3 mL",
    prep: null,
    tat: "~2h",
    talkingPoints: [
      "Mandatory before/after starting ACE inhibitors and ARBs.",
      "Pair with electrolytes for any blood-pressure medication review.",
    ],
  },
  electro: {
    what: "Sodium, potassium, chloride, bicarbonate.",
    detect: "Electrolyte imbalance from diuretics, vomiting/diarrhea, hypertension meds.",
    sample: "Single blood draw · ~2 mL",
    prep: null,
    tat: "~1h",
    talkingPoints: [
      "Critical for any patient on diuretics or anti-hypertensives.",
      "Pair with KFT — they're usually run together.",
    ],
  },
  "xray-chest": {
    what: "Single PA (front-to-back) chest radiograph.",
    detect: "Pneumonia, TB, enlarged heart, pleural effusion, masses.",
    sample: "Imaging · ~2 minutes inside the X-ray room",
    prep: "Remove metal items, jewelry and any clothing above the waist.",
    tat: "~30 min for radiologist read",
    talkingPoints: [
      "Low radiation dose — equivalent to 2–3 days of background exposure.",
      "Pregnancy must be ruled out before scanning.",
    ],
  },
  "ecg-12": {
    what: "12-lead resting trace of the heart's electrical rhythm.",
    detect: "Arrhythmia, ischemia, conduction blocks, prior heart attack.",
    sample: "Imaging · ~5 minutes lying still",
    prep: null,
    tat: "Immediate (auto-read + doctor confirms)",
    talkingPoints: [
      "Painless — 10 sticky electrodes; chest must be bare.",
      "First-line workup for chest pain, palpitations or syncope.",
    ],
  },
  "us-abd": {
    what: "Real-time ultrasound of liver, gallbladder, kidneys, pancreas, spleen.",
    detect: "Gallstones, fatty liver, kidney stones, abdominal masses.",
    sample: "Imaging · ~15–20 minutes",
    prep: "6-hour fasting; bladder full for pelvic views.",
    tat: "Same day",
    talkingPoints: [
      "No radiation — safe in pregnancy.",
      "Confirm fasting on arrival; gallbladder won't visualise without it.",
    ],
  },
};

// === AI rationale generator ===
function buildRecommendations(patient) {
  const buckets = [];
  const inCart = new Set((patient.cart?.items || []).map(i => i.id));
  const ageNum = patient.dob ? Math.max(0, Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000)) : (patient.age || 30);
  const sex = patient.sexAtBirth || patient.gender || "—";
  const reasons = Array.isArray(patient.visitReason) ? patient.visitReason : [patient.visitReason].filter(Boolean);
  const complaint = (patient.visitDetails?.chiefComplaint || "").toLowerCase();
  const meds = (patient.visitDetails?.medications || "").toLowerCase();
  const history = (patient.visitDetails?.medicalHistory || "").toLowerCase();
  const priors = patient.priorResults || [];

  const cat = (id) => ORDER_CATALOG.find(c => c.id === id);
  const reco = (id, reason, confidence = "medium") => {
    const c = cat(id);
    if (!c) return null;
    return {
      testId: id,
      name: c.name,
      price: c.price,
      kind: c.kind,
      reason,
      details: TEST_INFO[id] || null,
      confidence,
      inCart: inCart.has(id),
    };
  };

  const monthsSince = (iso) => {
    const t = new Date(iso).getTime();
    if (!t) return null;
    return Math.max(0, Math.round((Date.now() - t) / (30 * 24 * 3600 * 1000)));
  };

  // Re-order from last visit
  if (priors.length > 0) {
    const reorderItems = priors.slice(0, 3).map(p => {
      const m = monthsSince(p.visitDate);
      const ago = m == null ? "" : (m === 0 ? "this month" : m === 1 ? "1 month ago" : `${m} months ago`);
      const reason = `Previously ordered on ${p.visitDate}${ago ? ` (${ago})` : ""}. Re-testing now lets the doctor track changes against that baseline.${p.sensitive ? " Patient must approve viewing — this result is sensitive." : ""}`;
      const item = reco(p.testId, reason, "high");
      if (!item) return null;
      return { ...item, priorDate: p.visitDate, sensitive: p.sensitive };
    }).filter(Boolean);
    if (reorderItems.length) {
      buckets.push({ id: "reorder", title: "Re-order from last visit", icon: "RefreshCw", items: reorderItems });
    }
  }

  // Chief complaint
  if (complaint) {
    const complaintItems = [];
    if (/headache|fever|fatigue|tired/.test(complaint)) {
      complaintItems.push(reco("cbc", `Patient reports fatigue or fever — a CBC quickly screens for hidden infection or anemia, two common causes that change the visit plan immediately.`, "high"));
      complaintItems.push(reco("glucose", `Low blood sugar can mimic fatigue. A fasting glucose rules it in or out in under an hour.`, "medium"));
    }
    if (/chest|breath|cough/.test(complaint)) {
      complaintItems.push(reco("xray-chest", `Chest or respiratory symptoms — a chest X-ray is the standard first-line image to look for pneumonia, TB or fluid build-up.`, "high"));
      complaintItems.push(reco("ecg-12", `Chest discomfort can be cardiac. A 12-lead ECG takes 5 minutes and clears the heart as a possible cause before further workup.`, "medium"));
    }
    if (/abdomen|stomach|pain/.test(complaint)) {
      complaintItems.push(reco("us-abd", `Abdominal pain — ultrasound is painless, radiation-free and the most useful first image for gallstones, liver and kidney issues.`, "medium"));
      complaintItems.push(reco("urinalysis", `Urinalysis catches UTIs and kidney stones, both common pain sources that need very different treatment from gut causes.`, "medium"));
    }
    const filtered = complaintItems.filter(Boolean);
    if (filtered.length) {
      buckets.push({ id: "complaint", title: "Based on chief complaint", icon: "MessageSquare", items: filtered });
    }
  }

  // Age & sex
  const ageBased = [];
  if (ageNum >= 40) {
    ageBased.push(reco("lipid", `Patient is ${ageNum}. Cardiovascular risk roughly doubles every decade after 40, so a baseline lipid panel here catches metabolic risk before symptoms start. Repeat yearly if normal.`, "medium"));
    ageBased.push(reco("hba1c", `Adults 40+ should be screened for diabetes at least every 3 years even without symptoms — HbA1c gives a 3-month average without needing to fast.`, "medium"));
  }
  if (ageNum >= 50) {
    ageBased.push(reco("kft", `From 50 onward, baseline kidney function is recommended so any future medication can be dosed safely. KFT also screens for silent kidney disease.`, "medium"));
  }
  if (sex === "Female" && ageNum >= 18 && ageNum <= 50 && reasons.some(r => /general|annual|check/i.test(r))) {
    ageBased.push(reco("preg", `Routine offer for women of reproductive age before any imaging or medication that could affect a pregnancy. Strictly optional — only add if the patient wants it.`, "low"));
  }
  if (sex === "Female" && ageNum >= 35) {
    ageBased.push(reco("tsh", `Thyroid issues are 5–8× more common in women, especially after 35. A TSH catches hypothyroidism that often presents as fatigue or weight changes.`, "low"));
  }
  const ageItems = ageBased.filter(Boolean);
  if (ageItems.length) {
    buckets.push({ id: "age-sex", title: "Age & sex screening", icon: "User", items: ageItems });
  }

  // Medications & conditions
  const medBased = [];
  if (/lisinopril|amlodipine|enalapril|losartan|hypertens/.test(meds + history)) {
    medBased.push(reco("kft", `Patient is on an ACE inhibitor or ARB. Kidney function must be checked at start and every 6–12 months — these drugs can quietly raise creatinine.`, "high"));
    medBased.push(reco("electro", `Same regimen — potassium can climb dangerously on ACE/ARB therapy. Electrolytes flag this before symptoms appear.`, "high"));
  }
  if (/metformin|insulin|diabet/.test(meds + history)) {
    medBased.push(reco("hba1c", `Standard 3-month diabetes control check. Result drives whether the doctor adjusts the medication today.`, "high"));
    medBased.push(reco("lipid", `Diabetic patients have ~2× the cardiovascular risk — annual lipid monitoring is part of standard diabetic care.`, "medium"));
  }
  if (/statin|atorvastatin|simvastatin/.test(meds)) {
    medBased.push(reco("lft", `Patient is on a statin — liver enzymes need re-checking at baseline, 12 weeks in, then yearly. Statin-induced liver issues are rare but worth catching early.`, "high"));
  }
  const medItems = medBased.filter(Boolean);
  if (medItems.length) {
    buckets.push({ id: "meds", title: "Medications & conditions", icon: "Stethoscope", items: medItems });
  }

  return buckets.map(b => ({ ...b, items: b.items.filter(Boolean) })).filter(b => b.items.length > 0);
}

// === useAIRecommendations — exposed for the step header chip ===
export function useAIRecommendations(patient) {
  return useMemo(() => buildRecommendations(patient), [patient]);
}

// === WhyCard — shared rich explanation, used in AI panel + Add tests panel ===
//   Surfaces patient-specific context first, then everything a nurse needs to
//   confidently explain the test: what it measures, prep, turnaround, etc.
export function WhyCard({ reason, details }) {
  const hasDetails = !!details;
  return (
    <div className="why-card">
      {reason && (
        <div className="why-card-row why-card-why">
          <I.Sparkles size={10} className="why-card-ico" />
          <div className="why-card-body">
            <div className="why-card-label">Why for this patient</div>
            <p className="why-card-text">{reason}</p>
          </div>
        </div>
      )}
      {hasDetails && (
        <>
          <div className="why-card-row">
            <I.Info size={10} className="why-card-ico" />
            <div className="why-card-body">
              <div className="why-card-label">What it measures</div>
              <p className="why-card-text">{details.what}</p>
            </div>
          </div>
          {details.detect && (
            <div className="why-card-row">
              <I.Search size={10} className="why-card-ico" />
              <div className="why-card-body">
                <div className="why-card-label">Looks for</div>
                <p className="why-card-text">{details.detect}</p>
              </div>
            </div>
          )}
          {(details.sample || details.prep || details.tat) && (
            <div className="why-card-row why-card-meta-row">
              {details.sample && (
                <span className="why-card-meta">
                  <I.Flask size={10} /> {details.sample}
                </span>
              )}
              {details.prep && (
                <span className="why-card-meta why-card-meta-prep">
                  <I.AlertTriangle size={10} /> {details.prep}
                </span>
              )}
              {details.tat && (
                <span className="why-card-meta">
                  <I.Clock size={10} /> Result {details.tat.toLowerCase().startsWith("immediate") || details.tat.toLowerCase().startsWith("same") ? details.tat.toLowerCase() : `in ${details.tat}`}
                </span>
              )}
            </div>
          )}
          {details.talkingPoints && details.talkingPoints.length > 0 && (
            <div className="why-card-row">
              <I.MessageSquare size={10} className="why-card-ico" />
              <div className="why-card-body">
                <div className="why-card-label">Talking points</div>
                <ul className="why-card-bullets">
                  {details.talkingPoints.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// === AIInlinePanel — collapsible card living in Step 4 page flow ===
export function AIInlinePanel({ patient, onAdd, onPushToast }) {
  const t = useLang();
  const buckets = useAIRecommendations(patient);
  const totalCount = buckets.reduce((n, b) => n + b.items.length, 0);
  const eligibleCount = buckets.reduce((n, b) => n + b.items.filter(i => !i.inCart).length, 0);
  const hasHighConfidence = buckets.some(b => b.items.some(i => i.confidence === "high" && !i.inCart));

  // Default: expand if there are high-confidence suggestions
  const [expanded, setExpanded] = useState(hasHighConfidence);
  const [picks, setPicks] = useState(new Set());
  const [whyOpen, setWhyOpen] = useState(new Set());

  // Re-evaluate default expand when bucket signature changes (new patient context)
  const sig = buckets.map(b => b.id + ":" + b.items.length).join("|");
  useEffect(() => { setExpanded(hasHighConfidence); setPicks(new Set()); /* eslint-disable-next-line */ }, [sig]);

  const togglePick = useCallback((testId, available = true) => {
    if (!available) return;
    setPicks(prev => {
      const n = new Set(prev);
      if (n.has(testId)) n.delete(testId); else n.add(testId);
      return n;
    });
  }, []);
  const toggleWhy = (testId) => setWhyOpen(prev => {
    const n = new Set(prev);
    if (n.has(testId)) n.delete(testId); else n.add(testId);
    return n;
  });

  const allItems = buckets.flatMap(b => b.items);
  const addPicks = () => {
    if (picks.size === 0) return;
    const items = allItems.filter(i => picks.has(i.testId));
    onAdd?.(items);
    setPicks(new Set());
    onPushToast?.(`${items.length} test${items.length > 1 ? "s" : ""} added`, "success");
  };
  const addOne = (item) => {
    if (item.inCart) return;
    onAdd?.([item]);
    onPushToast?.(`${item.name} added`, "success");
  };

  // Empty state — keep the surface present so the user knows AI is "watching"
  if (buckets.length === 0) {
    return (
      <section className="ai-inline ai-inline-empty">
        <div className="ai-inline-glyph"><I.Sparkles size={11} /></div>
        <div className="ai-inline-empty-text">
          <strong>{t("ai.empty.title")}</strong>
          <span>{t("ai.empty.sub")}</span>
        </div>
      </section>
    );
  }

  // Top-of-stack peek: the highest-confidence eligible item across all buckets
  const peek = (() => {
    for (const conf of ["high", "medium", "low"]) {
      for (const b of buckets) {
        const it = b.items.find(i => !i.inCart && i.confidence === conf);
        if (it) return it;
      }
    }
    return null;
  })();

  return (
    <section className={"ai-inline" + (expanded ? " is-expanded" : "")}>
      <header className="ai-inline-head">
        <div className="ai-inline-glyph"><I.Sparkles size={11} /></div>
        <div className="ai-inline-title-wrap">
          <span className="ai-inline-title">{t("ai.title")}</span>
          <span className="ai-inline-meta">
            {eligibleCount > 0
              ? <>{eligibleCount} {t("ai.suggestions")}{peek && !expanded ? ` · ${t("ai.top")}: ${peek.name}` : ""}</>
              : t("ai.allInCart")}
          </span>
        </div>
        <button
          type="button"
          className="ai-inline-toggle"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
        >
          {expanded ? t("ai.collapse") : t("ai.expand")}
          <I.ChevronDown size={11} className={"ai-inline-chev" + (expanded ? " open" : "")} />
        </button>
      </header>

      {expanded && (
        <div className="ai-inline-body">
          {buckets.map(bucket => {
            const Ico = I[bucket.icon] || I.Sparkles;
            return (
              <div key={bucket.id} className="ai-inline-bucket">
                <div className="ai-inline-bucket-head">
                  <Ico size={10} />
                  <span className="ai-inline-bucket-title">{bucket.title}</span>
                  <span className="ai-inline-bucket-count">{bucket.items.length}</span>
                </div>
                <div className="ai-inline-bucket-items">
                  {bucket.items.map(item => {
                    const picked = picks.has(item.testId);
                    const showWhy = whyOpen.has(item.testId);
                    const disabled = item.inCart;
                    return (
                      <div
                        key={item.testId + bucket.id}
                        className={"ai-inline-rec" + (picked ? " is-picked" : "") + (disabled ? " is-disabled" : "")}
                      >
                        <button
                          type="button"
                          className="ai-inline-check"
                          onClick={() => togglePick(item.testId, !disabled)}
                          disabled={disabled}
                          aria-checked={picked}
                          role="checkbox"
                          aria-label={picked ? "Deselect" : "Select"}
                        >
                          {picked && <I.Check size={9} strokeWidth={3} />}
                        </button>
                        <span className="ai-inline-name">{item.name}</span>
                        {item.confidence && (
                          <span className={"ai-inline-conf ai-inline-conf-" + item.confidence}>{item.confidence}</span>
                        )}
                        <span className="ai-inline-price">${item.price}</span>
                        {disabled ? (
                          <span className="ai-inline-incart"><I.Check size={9} strokeWidth={3} /> {t("ai.inCart")}</span>
                        ) : (
                          <button type="button" className="ai-inline-add" onClick={() => addOne(item)}>
                            <I.Plus size={10} /> {t("ai.add")}
                          </button>
                        )}
                        <button
                          type="button"
                          className="ai-inline-why-btn"
                          onClick={() => toggleWhy(item.testId)}
                          aria-expanded={showWhy}
                        >
                          {showWhy ? t("ai.hideWhy") : t("ai.why")}
                        </button>
                        {showWhy && (
                          <div className="ai-inline-why">
                            <WhyCard reason={item.reason} details={item.details} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {picks.size > 0 && (
            <footer className="ai-inline-foot">
              <span className="ai-inline-foot-meta"><strong>{picks.size}</strong> {t("ai.selected")}</span>
              <button type="button" className="ai-inline-foot-cancel" onClick={() => setPicks(new Set())}>
                {t("ai.clear")}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={addPicks}>
                <I.Plus size={11} /> {t("ai.addSelected")}
              </button>
            </footer>
          )}
        </div>
      )}
    </section>
  );
}

// === AIChip — subtle indicator in step header (replaces the old purple summon button) ===
//   No gradient, no shadow. Just a quiet pill that scrolls/expands the inline panel.
export function AIChip({ patient, onScrollToPanel }) {
  const t = useLang();
  const buckets = useAIRecommendations(patient);
  const eligibleCount = buckets.reduce((n, b) => n + b.items.filter(i => !i.inCart).length, 0);
  if (eligibleCount === 0) return null;
  return (
    <button type="button" className="ai-chip" onClick={onScrollToPanel}>
      <I.Sparkles size={10} className="ai-chip-glyph" />
      <span className="ai-chip-label">{eligibleCount} {t("ai.chip.label")}</span>
    </button>
  );
}

export function AISidePanel({ open, onClose, patient, onAdd, onPushToast }) {
  const t = useLang();
  if (!open) return null;

  return (
    <>
      <div className="ai-panel-backdrop is-open" onClick={onClose} />
      <aside className="ai-panel is-open" role="dialog" aria-modal="true" aria-label={t("ai.title")}>
        <header className="ai-panel-head">
          <div className="ai-panel-title">
            <div className="ai-panel-spark"><I.Sparkles size={14} /></div>
            <div>
              <div className="ai-panel-h1">{t("ai.title")}</div>
              <div className="ai-panel-h2">{t("ai.subtitle")}</div>
            </div>
          </div>
          <button type="button" className="ai-panel-close" onClick={onClose} aria-label="Close AI panel">
            <I.X size={14} />
          </button>
        </header>
        <div className="ai-panel-body">
          <AIInlinePanel patient={patient} onAdd={onAdd} onPushToast={onPushToast} />
        </div>
      </aside>
    </>
  );
}
