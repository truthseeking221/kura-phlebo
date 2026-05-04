// === AddTestsPanel — unified test picker ===
//
//   Replaces the previous 3 disjoint cards (AI suggestions / Catalogue / Previous tests).
//   Same job, same row pattern, different *lenses* over the same catalogue.
//
//   Lenses (view tabs, left → right):
//     1. Smart       — AI + previous merged, ranked by relevance (default)
//     2. Previous    — patient's historical orders only
//     3. Diagnostic panels — DIAG-style clinical categories over the catalogue
//
//   Every row is the same: name · [badges…] · price · [Add/Remove]
//   Badges compose by source — AI confidence, last-tested date, sensitive, popular.
//   "Why?" is a per-row icon; clicking expands a one-line rationale inline.
//   Actions are explicit per row; keyboard Enter mirrors the visible button.
//
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { I } from "./icons";
import { ORDER_CATALOG } from "./OrderCart";
import { useAIRecommendations, TEST_INFO, WhyCard } from "./AIPanel";
import { Kbd } from "./shared";
import { getCoverage } from "./coverage";

const KHR_RATE = 4100;
const fmtPrice = (usd, ccy) => ccy === "KHR"
  ? "៛" + Math.round((usd || 0) * KHR_RATE).toLocaleString()
  : "$" + (usd || 0).toFixed(2);
// Compact count for category badges so a 4-digit lab catalog doesn't blow
// out the chip. 1234 → "1.2k". Sub-1000 stays exact.
const fmtCount = (n) => {
  if (n == null) return "";
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return Math.round(n / 1000) + "k";
};

// === flyToCart — parabolic toss animation when adding tests ===
//
//   A small pill (kind-dot + name) lifts off the row, arcs along a
//   parabolic path, shrinks, and lands on the cart icon. Cart icon +
//   count then react with a soft spring bump.
//
//   Pure DOM + Web Animations API — no library, no React rerender.
//   Honors prefers-reduced-motion: skips the toss, still bumps the cart.
//
const FLY_KIND_DOT = {
  visit:   "#3a78a6",
  lab:     "#168873",
  imaging: "#bc7243",
  ecg:     "#af5b64",
  vitals:  "#756aa3",
  telecon: "#2f836c",
};
let _bumpTimer = 0;

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches;
}

function firstVisible(candidates) {
  return candidates.find(el => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) || candidates.find(Boolean) || null;
}

function visibleDesktopCart() {
  const scopedCart = document.querySelector(".desktop-cart-rail-body .order-cart");
  const fallbackCarts = Array.from(document.querySelectorAll(".order-cart"))
    .filter(el => !el.closest(".mobile-cart-sheet"));
  return firstVisible([scopedCart, ...fallbackCarts]);
}

function getMobileCartTab() {
  return document.querySelector('.mobile-cart-sheet:not([aria-hidden]) [data-mobile-cart-tab="cart"]');
}

function getFlyTarget() {
  if (isMobileViewport()) {
    return firstVisible([
      getMobileCartTab(),
      document.querySelector(".mobile-cart-bar:not([hidden]) .mobile-cart-bar-icon"),
      document.querySelector(".mobile-cart-bar:not([hidden]) .mobile-cart-bar-summary"),
    ]);
  }
  const cart = visibleDesktopCart();
  return firstVisible([
    cart?.querySelector(".cart-hd2-ico"),
    cart?.querySelector(".cart-hd2-count"),
    cart?.querySelector(".cart-hd2"),
    cart,
    ...Array.from(document.querySelectorAll(".cart-hd2-ico")),
  ]);
}

function getBumpTarget() {
  if (isMobileViewport()) {
    return firstVisible([
      getMobileCartTab(),
      document.querySelector(".mobile-cart-bar:not([hidden]) .mobile-cart-bar-icon"),
      document.querySelector(".mobile-cart-bar:not([hidden]) .mobile-cart-bar-summary"),
    ]);
  }
  return visibleDesktopCart();
}

function bumpCart() {
  // Bump whichever cart surface is actually visible: the Cart tab while
  // the mobile sheet is open, the dock when closed, or the desktop cart.
  const el = getBumpTarget();
  if (!el) return;
  el.classList.remove("is-receiving");
  // force reflow so the animation replays even on rapid successive bumps
  void el.offsetWidth;
  el.classList.add("is-receiving");
  window.clearTimeout(_bumpTimer);
  _bumpTimer = window.setTimeout(() => el.classList.remove("is-receiving"), 600);
}

function flyToCart(sourceEl, { name, kind }) {
  // Pick the animation target based on what the nurse can actually see:
  //   - mobile sheet open      → Cart tab in the bottom sheet header
  //   - mobile sheet closed    → dock icon at the bottom of the screen
  //   - desktop                → sticky cart rail icon
  // Falling back through the list lets the same panel work in all three
  // contexts without the ghost flying offscreen.
  const target = getFlyTarget();
  if (!sourceEl || !target) { bumpCart(); return; }

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) { bumpCart(); return; }

  const src = sourceEl.getBoundingClientRect();
  const dst = target.getBoundingClientRect();
  const sx = src.left + src.width / 2;
  const sy = src.top + src.height / 2;
  const tx = (dst.left + dst.width / 2) - sx;
  const ty = (dst.top + dst.height / 2) - sy;

  const ghost = document.createElement("div");
  ghost.className = "fly-ghost";
  ghost.style.left = sx + "px";
  ghost.style.top  = sy + "px";
  const dot = document.createElement("span");
  dot.className = "fly-ghost-dot";
  dot.style.background = FLY_KIND_DOT[kind] || FLY_KIND_DOT.lab;
  const txt = document.createElement("span");
  txt.className = "fly-ghost-text";
  txt.textContent = name;
  ghost.appendChild(dot);
  ghost.appendChild(txt);
  document.body.appendChild(ghost);

  // Parabolic arc — peak elevated above the chord, scaled by distance
  const dist = Math.hypot(tx, ty);
  const lift = Math.min(120, Math.max(48, dist * 0.22));
  const mx = tx * 0.5;
  const my = ty * 0.5 - lift;

  const DUR = 640;
  const anim = ghost.animate([
    { transform: "translate(-50%,-50%) translate(0,0) scale(0.92)",                                           opacity: 0, offset: 0 },
    { transform: "translate(-50%,-50%) translate(0,0) scale(1)",                                              opacity: 1, offset: 0.10 },
    { transform: `translate(-50%,-50%) translate(${mx}px, ${my}px) scale(0.78) rotate(-3deg)`,                opacity: 1, offset: 0.55 },
    { transform: `translate(-50%,-50%) translate(${tx}px, ${ty}px) scale(0.16) rotate(-7deg)`,                opacity: 0, offset: 1 },
  ], { duration: DUR, easing: "cubic-bezier(.42, 0, .25, 1)", fill: "forwards" });

  let done = false;
  const finish = () => { if (done) return; done = true; ghost.remove(); bumpCart(); };
  anim.onfinish = finish;
  anim.oncancel = () => { if (done) return; done = true; ghost.remove(); };
  // Safety net: cleanup even if onfinish is throttled (background tab, etc.)
  window.setTimeout(finish, DUR + 200);
}

// === View definitions ===
//   Spec v12 §Step 4: tabs replaced by a LEFT SIDE PANEL grouped into two
//   sections — Smart sources (top) and diagnostic panel categories (bottom).
//   Telecon is removed from the catalogue (it's now Step 5).
//   Visit is removed (visit fee auto-adds to the cart).
//   Booking code moved upstream to Step 1 — it is an intake artifact, not a catalogue category.
//
const VIEWS = [
  // Smart sources
  { id: "smart",    label: "Smart",         icon: "Sparkles",   group: "smart" },
  { id: "bundles",  label: "Bundles",       icon: "Package",    group: "smart" },
  { id: "previous", label: "Previous",      icon: "RefreshCw",  group: "smart" },
];
const SEARCHABLE_ORDER_KINDS = new Set(["lab", "imaging", "ecg", "vitals"]);

const PANEL_CATEGORIES = [
  { id: "general-health", label: "General Health", icon: "PanelGeneralHealth", testIds: ["cbc", "glucose", "lipid", "urinalysis", "vit-bp", "vit-bmi", "vit-temp"] },
  { id: "stds", label: "STDs", icon: "PanelStds", terms: ["hiv", "syphilis", "gonorrhoeae", "chlamydia", "trichomonas", "hepatitis b", "hepatitis c", "hbsag"] },
  { id: "cancer", label: "Cancer", icon: "PanelCancer", terms: ["cancer", "tumor", "tumour", "brca", "egfr", "braf", "kras", "tp53", "mutation", "cea"] },
  { id: "hpv", label: "HPV", icon: "PanelHpv", terms: ["human papillomavirus", "hpv"] },
  { id: "cardiology", label: "Cardiology", icon: "PanelCardiology", testIds: ["ecg-12", "ecg-stress", "ecg-holter", "echo", "lipid"], terms: ["troponin", "bnp", "ck-mb", "cholesterol"] },
  { id: "liver", label: "Liver", icon: "PanelLiver", testIds: ["lft", "hbsag"], terms: ["alt", "ast", "bilirubin", "alkaline phosphatase", "gamma gt", "hepatitis"] },
  { id: "kidney", label: "Kidney", icon: "PanelKidney", testIds: ["kft", "urinalysis"], terms: ["creatinine", "urea", "cystatin", "microalbumin", "albumin/creatinine", "uric acid"] },
  { id: "thyroid", label: "Thyroid", icon: "PanelThyroid", testIds: ["tsh", "us-thyroid"], terms: ["thyroid", "free t3", "free t4", "thyroglobulin", "tpo"] },
  { id: "diabetes", label: "Diabetes", icon: "PanelDiabetes", testIds: ["hba1c", "glucose", "urinalysis", "kft", "lipid"], terms: ["insulin", "c-peptide", "fructosamine"] },
  { id: "lipid", label: "Lipid", icon: "PanelLipid", testIds: ["lipid"], terms: ["cholesterol", "triglycerides", "apolipoprotein", "lipoprotein"] },
  { id: "hepatitis", label: "Hepatitis", icon: "PanelHepatitis", testIds: ["hbsag", "lft"], terms: ["hepatitis", "hbsag"] },
  { id: "reproductive-health", label: "Reproductive Health", icon: "PanelReproductiveHealth", testIds: ["preg"], terms: ["estradiol", "fsh", "lh", "progesterone", "prolactin", "testosterone", "sex hormone"] },
  { id: "ovarian-reserve", label: "Ovarian Reserve", icon: "PanelOvarianReserve", terms: ["anti-mullerian", "amh", "fsh", "estradiol", "inhibin"] },
  { id: "pre-marital", label: "Pre-marital", icon: "PanelPreMarital", testIds: ["cbc", "hbsag"], terms: ["hiv", "syphilis", "hepatitis", "blood type", "rubella"] },
  { id: "osteoporosis", label: "Osteoporosis", icon: "PanelOsteoporosis", terms: ["calcium", "vitamin d", "parathyroid", "phosphate"] },
  { id: "arthritis", label: "Arthritis", icon: "PanelArthritis", terms: ["rheumatoid", "anti-ccp", "esr", "c-reactive", "ana", "hla-b27"] },
  { id: "allergy", label: "Allergy", icon: "PanelAllergy", terms: ["allergy", "specific ige", "latex", "peanut", "shrimp", "mold", "pollen"] },
  { id: "vitamin", label: "Vitamin", icon: "PanelVitamin", testIds: ["vit-d", "vit-b12"], terms: ["vitamin", "folate"] },
  { id: "food-intolerance", label: "Food Intolerance", icon: "PanelFoodIntolerance", terms: ["cow milk", "egg", "peanut", "wheat", "soybean", "shrimp", "codfish", "sesame"] },
  { id: "nipt", label: "NIPT", icon: "PanelNipt", terms: ["nipt", "trisomy", "fetal", "chromosome"] },
  { id: "gestational-diabetes", label: "Gestational Diabetes", icon: "PanelGestationalDiabetes", testIds: ["glucose", "hba1c"], terms: ["glucose", "insulin"] },
  { id: "preeclampsia", label: "Preeclampsia", icon: "PanelPreeclampsia", testIds: ["urinalysis", "kft", "lft"], terms: ["placental growth factor", "protein/creatinine", "platelet"] },
  { id: "pregnancy", label: "Pregnancy", icon: "PanelPregnancy", testIds: ["preg", "us-preg"], terms: ["beta-hcg", "estriol", "progesterone"] },
  { id: "pregnancy-torch", label: "Pregnancy TORCH", icon: "PanelPregnancyTorch", terms: ["toxoplasma", "rubella", "cytomegalovirus", "herpes", "igm antibody", "igg antibody"] },
  { id: "parasite", label: "Parasite", icon: "PanelParasite", terms: ["malaria", "giardia", "strongyloides", "parasite", "stool"] },
  { id: "fever", label: "Fever", icon: "PanelFever", testIds: ["cbc", "covid"], terms: ["blood culture", "dengue", "influenza", "malaria", "c-reactive", "procalcitonin"] },
  { id: "utis", label: "UTIs", icon: "PanelUtis", testIds: ["urinalysis"], terms: ["urine culture", "urine"] },
  { id: "fitness", label: "Fitness", icon: "PanelFitness", testIds: ["cbc", "glucose", "lipid", "lft", "kft", "vit-bp", "vit-bmi"], terms: ["ck", "creatine kinase", "magnesium"] },
  { id: "drug", label: "Drug", icon: "PanelDrug", terms: ["drug", "toxicology", "serum level", "urine screen", "therapeutic"] },
  { id: "dna", label: "DNA", icon: "PanelDna", terms: ["mutation analysis", "gene", "brca", "dna", "cftr", "hla"] },
];

const PANEL_VIEWS = PANEL_CATEGORIES.map(panel => ({
  id: `panel-${panel.id}`,
  label: panel.label,
  icon: panel.icon,
  group: "panels",
  panelId: panel.id,
}));

VIEWS.push(...PANEL_VIEWS);

// === Specialty colour tokens — Spec v12 §8 visual clarity rules ===
//   Each specialty has a consistent colour for the small uppercase pill.
//   These are kept light enough to read on the row's white background.
const SPECIALTY_META = {
  lab:        { label: "BIOCHEM/HAEM",  color: "#1d4ed8", bg: "#dbeafe" },
  imaging:    { label: "IMAGING",       color: "#3730a3", bg: "#e0e7ff" },
  ecg:        { label: "CARDIO",        color: "#9d174d", bg: "#fce7f3" },
  vitals:     { label: "VITALS",        color: "#9a3412", bg: "#fed7aa" },
  visit:      { label: "VISIT",         color: "#1e40af", bg: "#bfdbfe" },
  telecon:    { label: "TELECON",       color: "#15803d", bg: "#bbf7d0" },
};

const LAB_CATEGORY_META = {
  Biochemistry:        { label: "BIOCHEM",   color: "#1d4ed8", bg: "#dbeafe" },
  Endocrinology:       { label: "ENDO",      color: "#0f766e", bg: "#ccfbf1" },
  Haematology:         { label: "HAEM",      color: "#991b1b", bg: "#fee2e2" },
  Coagulation:         { label: "COAG",      color: "#9d174d", bg: "#fce7f3" },
  Microbiology:        { label: "MICRO",     color: "#166534", bg: "#dcfce7" },
  Immunology:          { label: "IMMUNO",    color: "#6d28d9", bg: "#ede9fe" },
  Urinalysis:          { label: "URINE",     color: "#9a3412", bg: "#ffedd5" },
  "Blood Gas":         { label: "BLOOD GAS", color: "#0e7490", bg: "#cffafe" },
  Toxicology:          { label: "TOX",       color: "#854d0e", bg: "#fef3c7" },
  "Therapeutic Drugs": { label: "TDM",       color: "#115e59", bg: "#ccfbf1" },
  Molecular:           { label: "MOLEC",     color: "#4338ca", bg: "#e0e7ff" },
  Allergy:             { label: "ALLERGY",   color: "#be185d", bg: "#fce7f3" },
};

function getSpecialtyMeta(row) {
  if (row.kind === "lab" && row.category) {
    return LAB_CATEGORY_META[row.category] || SPECIALTY_META.lab;
  }
  return SPECIALTY_META[row.kind];
}

function rowMatchesSearch(row, query) {
  const specialty = getSpecialtyMeta(row);
  return [
    row.name,
    row.kind,
    row.category,
    specialty?.label,
  ].filter(Boolean).some(value => value.toLowerCase().includes(query));
}

// === Bundles — curated multi-test packages defined by the medical director ===
//   The value prop is curation + speed: clinical-guideline-aligned sets that take
//   one click instead of five. The pricing is the honest sum of included tests
//   (no fake "save N%" — the lift comes from completeness, not discount theatre).
//   Edit this list when MD updates the standard packages.
//
const BUNDLES = [
  {
    id: "annual-physical",
    name: "Annual physical",
    purpose: "Routine yearly check-up",
    testIds: ["visit-gp", "cbc", "glucose", "lipid", "urinalysis", "vit-bp", "vit-bmi"],
    why: "Standard adult yearly screen — covers GP visit, baseline blood work, urine, and vitals.",
  },
  {
    id: "diabetes-followup",
    name: "Diabetes follow-up",
    purpose: "Known T2D, 3-month review",
    testIds: ["hba1c", "glucose", "lipid", "urinalysis", "kft"],
    why: "Tracks HbA1c trend plus end-organ markers (kidney + lipids) per ADA follow-up guidance.",
  },
  {
    id: "cardiac-risk",
    name: "Cardiac risk screen",
    purpose: "Chest pain or family history",
    testIds: ["visit-gp", "ecg-12", "lipid", "vit-bp", "cbc"],
    why: "First-line cardiac workup — ECG plus modifiable-risk markers for the GP review.",
  },
  {
    id: "preemployment",
    name: "Pre-employment / school",
    purpose: "Fitness certificate",
    testIds: ["visit-gp", "cbc", "urinalysis", "xray-chest", "vit-bp", "vit-bmi"],
    why: "Standard fitness-to-work / fitness-to-attend documentation set.",
  },
  {
    id: "antenatal-first",
    name: "Antenatal — first visit",
    purpose: "Confirmed pregnancy intake",
    testIds: ["visit-spec", "cbc", "urinalysis", "preg", "glucose", "us-preg", "vit-bp"],
    why: "WHO first-trimester baseline — confirms viability, screens anaemia, glucose, and hypertensive risk.",
  },
  {
    id: "anaemia-workup",
    name: "Anaemia workup",
    purpose: "Fatigue, pallor, low Hb",
    testIds: ["visit-gp", "cbc", "ferritin", "vit-b12", "esr"],
    why: "Distinguishes iron-deficiency from B12/folate or chronic-disease anaemia before treatment.",
  },
  {
    id: "thyroid-screen",
    name: "Thyroid screen",
    purpose: "Suspected hypo/hyperthyroid",
    testIds: ["visit-spec", "tsh", "us-thyroid"],
    why: "TSH plus targeted ultrasound covers function and gross structure in one visit.",
  },
  {
    id: "liver-workup",
    name: "Liver workup",
    purpose: "Elevated LFT or alcohol use",
    testIds: ["visit-gp", "cbc", "lft", "hbsag", "us-abd"],
    why: "Function tests, viral hepatitis screen, and abdominal imaging — standard hepatology starter set.",
  },
  {
    id: "hypertension-followup",
    name: "Hypertension follow-up",
    purpose: "Known HTN, quarterly review",
    testIds: ["visit-gp", "vit-bp", "lipid", "kft", "electro", "ecg-12"],
    why: "End-organ surveillance — kidney, electrolytes, lipid trend, plus ECG for LVH watch.",
  },
  {
    id: "senior-wellness",
    name: "Senior wellness (60+)",
    purpose: "Geriatric annual review",
    testIds: ["visit-gp", "cbc", "glucose", "lipid", "kft", "urinalysis", "ecg-12", "vit-bp", "vit-vision", "vit-audio"],
    why: "Adds cardiac baseline plus vision/hearing screens to the standard annual — flags fall and frailty risk early.",
  },
  {
    id: "presurgical",
    name: "Pre-surgical clearance",
    purpose: "Elective surgery clearance",
    testIds: ["visit-gp", "cbc", "ptinr", "lft", "kft", "electro", "ecg-12", "xray-chest"],
    why: "Anaesthesia-team minimum — coagulation, organ function, baseline cardio-pulmonary imaging.",
  },
  {
    id: "ortho-knee",
    name: "Knee pain workup",
    purpose: "Persistent knee pain or injury",
    testIds: ["visit-spec", "xray-knee", "mri-knee", "esr"],
    why: "Plain film first, MRI for soft tissue, ESR rules out inflammatory cause.",
  },
];

function buildBundleRows({ inCart }) {
  return BUNDLES.map(b => {
    const items = b.testIds.map(id => ORDER_CATALOG.find(c => c.id === id)).filter(Boolean);
    const price = items.reduce((s, it) => s + (it.price || 0), 0);
    const remaining = items.filter(it => !inCart.has(it.id));
    return {
      id: b.id,
      name: b.name,
      purpose: b.purpose,
      why: b.why,
      items,
      price,
      remainingCount: remaining.length,
      addedCount: items.length - remaining.length,
      allInCart: remaining.length === 0,
    };
  });
}

function panelMatchesItem(item, panel) {
  if (!panel) return false;
  if (panel.testIds?.includes(item.id)) return true;
  const haystack = [
    item.id,
    item.name,
    item.kind,
    item.category,
  ].filter(Boolean).join(" ").toLowerCase();
  return (panel.terms || []).some(term => haystack.includes(String(term).toLowerCase()));
}

function getPanelItems(panelId) {
  const panel = PANEL_CATEGORIES.find(p => p.id === panelId);
  if (!panel) return [];
  return ORDER_CATALOG.filter(item =>
    SEARCHABLE_ORDER_KINDS.has(item.kind) && panelMatchesItem(item, panel)
  );
}

// === Row builder — produces uniform shape regardless of source ===
//   { id, name, price, kind, badges: { ai, previous, sensitive, popular, reason } }
//
function useRows({ view, search, patient, buckets, priors, inCart }) {
  return useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const aiMap = new Map();
    buckets.forEach(b => b.items.forEach(it => {
      // keep the highest-confidence reason if the same testId appears in multiple buckets
      const existing = aiMap.get(it.testId);
      const rank = (c) => ({ high: 3, medium: 2, low: 1 })[c] || 0;
      if (!existing || rank(it.confidence) > rank(existing.confidence)) {
        aiMap.set(it.testId, it);
      }
    }));
    const priorMap = new Map(priors.map(p => [p.testId, p]));

    const decorate = (catItem, extra = {}) => {
      const ai = aiMap.get(catItem.id);
      const prior = priorMap.get(catItem.id);
      const info = TEST_INFO[catItem.id] || null;
      let reason = ai?.reason || null;
      if (!reason && prior) {
        reason = `Previously ordered on ${prior.visitDate}. Re-testing now lets the doctor compare against that baseline.${prior.sensitive ? " Sensitive — patient must approve viewing." : ""}`;
      }
      return {
        id: catItem.id,
        name: catItem.name,
        price: catItem.price,
        kind: catItem.kind,
        category: catItem.category,
        unavailable: !!catItem.unavailable,
        unavailableReason: catItem.unavailableReason,
        availableBack: catItem.availableBack,
        inCart: inCart.has(catItem.id),
        badges: {
          ai: ai?.confidence,
          previous: prior?.visitDate,
          sensitive: prior?.sensitive || extra.sensitive,
          popular: catItem.popular,
          reason,
          details: info,
        },
      };
    };

    let rows = [];

    if (searchTerm) {
      rows = ORDER_CATALOG
        .filter(c => SEARCHABLE_ORDER_KINDS.has(c.kind))
        .map(c => decorate(c))
        .filter(r => rowMatchesSearch(r, searchTerm));
    } else if (view === "smart") {
      // Priors first (most personal signal), then AI items not already shown
      const seen = new Set();
      for (const p of priors) {
        const cat = ORDER_CATALOG.find(c => c.id === p.testId);
        if (!cat) continue;
        rows.push(decorate(cat));
        seen.add(p.testId);
      }
      for (const item of aiMap.values()) {
        if (seen.has(item.testId)) continue;
        const cat = ORDER_CATALOG.find(c => c.id === item.testId);
        if (!cat) continue;
        rows.push(decorate(cat));
        seen.add(item.testId);
      }
    } else if (view === "previous") {
      for (const p of priors) {
        const cat = ORDER_CATALOG.find(c => c.id === p.testId);
        if (!cat) continue;
        rows.push(decorate(cat));
      }
    } else if (view.startsWith("panel-")) {
      const panelId = view.replace(/^panel-/, "");
      rows = getPanelItems(panelId).map(c => decorate(c));
    } else {
      // catalogue by kind
      const items = ORDER_CATALOG.filter(c => c.kind === view);
      rows = items.map(c => decorate(c));
    }

    return rows;
  }, [view, search, buckets, priors, inCart]);
}

// === Per-row badges ===
function BadgeAI({ conf }) {
  return <span className={"atp-badge atp-badge-ai atp-badge-ai-" + conf} title={`AI suggested · ${conf} confidence`}>{conf}</span>;
}
function BadgePrev({ date }) {
  return <span className="atp-badge atp-badge-prev" title={`Last tested ${date}`}>last {date}</span>;
}
function BadgeSensitive() {
  return <span className="atp-badge atp-badge-sensitive" title="Sensitive — OTP required to view"><I.Lock size={9} /> sensitive</span>;
}
function BadgePopular() {
  return <span className="atp-badge atp-badge-popular">popular</span>;
}

// === BundleRow — multi-test package, distinct visual treatment from TestRow ===
function BundleRow({ bundle, ccy, inCart, onAddBundle }) {
  const { name, purpose, why, items, price, allInCart, addedCount, remainingCount } = bundle;
  return (
    <div className={"atp-bundle" + (allInCart ? " is-incart" : "")}>
      <div className="atp-bundle-main">
        <div className="atp-bundle-head">
          <div className="atp-bundle-name-block">
            <div className="atp-bundle-name">
              <I.Package size={12} className="atp-bundle-icon" />
              <span>{name}</span>
              <span className="atp-bundle-count">{items.length} tests</span>
            </div>
            <div className="atp-bundle-purpose">{purpose}</div>
          </div>
          <span className="atp-bundle-price">{fmtPrice(price, ccy)}</span>
          {allInCart ? (
            <span className="atp-bundle-added"><I.Check size={11} strokeWidth={3} /> All added</span>
          ) : (
            <button type="button" className="atp-bundle-add" onClick={() => onAddBundle(bundle)}>
              <I.Plus size={11} /> {addedCount > 0 ? `Add ${remainingCount} more` : "Add bundle"}
            </button>
          )}
        </div>
        <div className="atp-bundle-tests">
          {items.map(it => (
            <span
              key={it.id}
              className={"atp-bundle-pill" + (inCart.has(it.id) ? " is-in-cart" : "")}
              title={inCart.has(it.id) ? `${it.name} — already in cart` : it.name}
            >
              {inCart.has(it.id) && <I.Check size={8} strokeWidth={3} />}
              {it.name}
            </span>
          ))}
        </div>
        <div className="atp-bundle-why">
          <I.Sparkles size={10} />
          <span>{why}</span>
        </div>
      </div>
    </div>
  );
}

// === Coverage label — Spec v12 §4 ===
//   ✓ Insurer X% covered (green) · ✕ Not covered (muted) · ? Unconfirmed (amber)
//   · 🔒 Pre-auth required (purple). Hidden when patient has no policy on file.
function CoverageLabel({ coverage }) {
  if (!coverage) return null;
  if (coverage.kind === "covered") {
    return (
      <span className="atp-cov atp-cov-yes" title={`${coverage.insurer} covers ${coverage.percent}% of this test`}>
        <I.Check size={9} strokeWidth={3} /> {coverage.insurer} {coverage.percent}%
      </span>
    );
  }
  if (coverage.kind === "not-covered") {
    return <span className="atp-cov atp-cov-no" title="Insurer confirmed not covered"><I.X size={9} /> Not covered</span>;
  }
  if (coverage.kind === "unconfirmed") {
    return <span className="atp-cov atp-cov-unsure" title="Coverage unconfirmed for this test">? Unconfirmed</span>;
  }
  if (coverage.kind === "preauth") {
    return <span className="atp-cov atp-cov-preauth" title="Insurer requires pre-authorisation"><I.Lock size={9} /> Pre-auth</span>;
  }
  return null;
}

// === TestRow — the universal row ===
//   The row keeps clinical metadata dense, but the order mutation is explicit:
//   a visible Add/Remove button instead of a checkbox or hidden staging state.
function TestRow({ row, highlighted, onAddOne, onRemoveOne, onNotifyUnavailable, whyOpen, onToggleWhy, ccy, coverage, specialtyMeta }) {
  const { id, name, price, inCart, badges, unavailable } = row;
  const hasReason = !!badges.reason || !!badges.details;
  const handleRowClick = !unavailable
    ? () => { if (inCart) onRemoveOne?.(row); else onAddOne?.(row); }
    : undefined;

  return (
    <div
      data-row-id={id}
      className={"atp-row" + (inCart ? " is-incart" : "") + (highlighted ? " is-highlighted" : "") + (unavailable ? " is-unavailable" : "") + (!unavailable ? " is-clickable" : "")}
      onClick={handleRowClick}
    >
      <div className="atp-row-name">
        <span className="atp-name">{name}</span>
        <div className="atp-badges">
          {specialtyMeta && (
            <span className="atp-specialty" style={{ color: specialtyMeta.color, background: specialtyMeta.bg }}>
              {unavailable ? "UNAVAILABLE" : specialtyMeta.label}
            </span>
          )}
          {badges.ai && <BadgeAI conf={badges.ai} />}
          {badges.previous && <BadgePrev date={badges.previous} />}
          {badges.sensitive && <BadgeSensitive />}
          {badges.popular && !badges.ai && !badges.previous && <BadgePopular />}
          <CoverageLabel coverage={coverage} />
          {unavailable && (
            <span className="atp-badge atp-badge-unavailable" title={row.unavailableReason || "Temporarily unavailable"}>
              <I.AlertTriangle size={9} /> Back ~{row.availableBack || "soon"}
            </span>
          )}
        </div>
      </div>

      <span className="atp-price">{fmtPrice(price, ccy)}</span>

      {unavailable && !inCart && (
        <button type="button" className="atp-notify-btn" onClick={(e) => { e.stopPropagation(); onNotifyUnavailable?.(row); }}>
          Notify me
        </button>
      )}

      {!unavailable && (
        <button
          type="button"
          className={"atp-row-action" + (inCart ? " atp-row-remove" : " atp-row-add")}
          onClick={(e) => {
            e.stopPropagation();
            if (inCart) onRemoveOne?.(row);
            else onAddOne?.(row);
          }}
          aria-label={inCart ? `Remove ${name}` : `Add ${name}`}
        >
          {inCart ? (
            <>- Remove</>
          ) : (
            <><I.Plus size={11} /> Add</>
          )}
        </button>
      )}

      {hasReason && (
        <button
          type="button"
          className={"atp-why-btn" + (whyOpen ? " is-on" : "")}
          onClick={(e) => { e.stopPropagation(); onToggleWhy(id); }}
          title={whyOpen ? "Hide reason" : "Show AI reason"}
          aria-expanded={whyOpen}
        >
          <I.Info size={11} />
        </button>
      )}

      {whyOpen && hasReason && (
        <div className="atp-why">
          <WhyCard reason={badges.reason} details={badges.details} />
        </div>
      )}
    </div>
  );
}

// === Booking code section — shared intake control ===
//   A doctor from a previous teleconsult can prescribe a booking code that
//   pre-populates a specific set of tests. Nurse scans or enters; on valid
//   code, pre-selected tests render with [Add all to cart].
//
//   Mock codes are defined here so this can ship before the API exists.
//   `consumed` defaults to false; once added to cart we mark it consumed.
export const MOCK_BOOKING_CODES = {
  "BC-2026042-DIA3": {
    code: "BC-2026042-DIA3",
    doctor: "Dr. Sopheap Chan",
    issuedAt: "2026-04-14",
    testIds: ["hba1c", "glucose", "kft", "lipid"],
  },
  "BC-2026048-CARD": {
    code: "BC-2026048-CARD",
    doctor: "Dr. Sokha Pich",
    issuedAt: "2026-04-21",
    testIds: ["ecg-12", "lipid", "vit-bp"],
  },
};

export const BOOKING_CODE_PATTERN = /^BC-[A-Z0-9]{7}-[A-Z0-9]{4}$/;

export function formatBookingCode(raw) {
  const chars = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = chars.startsWith("BC") ? chars.slice(2) : chars;
  const first = body.slice(0, 7);
  const second = body.slice(7, 11);
  if (!first) return "";
  return `BC-${first}${second ? `-${second}` : ""}`;
}

export function BookingCodeSection({
  patient,
  inCart,
  onAddBundle,
  onPushToast,
  ccy,
  className = "",
  introTitle = "Booking code",
  introText = "Scan or enter the code on the patient's prescription or teleconsult summary.",
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // { ok, code?, items?, message? }
  const [picks, setPicks] = useState(new Set());

  const consumedCodes = patient.consumedBookingCodes || [];

  const check = (raw) => {
    const code = formatBookingCode(raw || input);
    if (!code) return;
    if (!BOOKING_CODE_PATTERN.test(code)) {
      setResult({ ok: false, message: "Enter booking code as BC-XXXXXXX-XXXX." });
      return;
    }
    if (consumedCodes.includes(code)) {
      setResult({ ok: false, message: "This code has already been used for this patient." });
      return;
    }
    const def = MOCK_BOOKING_CODES[code];
    if (!def) {
      setResult({ ok: false, message: "Code not found or expired." });
      return;
    }
    const items = def.testIds.map(id => ORDER_CATALOG.find(c => c.id === id)).filter(Boolean);
    setResult({ ok: true, code: def, items });
    setPicks(new Set(items.filter(it => !inCart.has(it.id)).map(it => it.id)));
  };

  const togglePick = (id) => {
    setPicks(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const addAll = () => {
    if (!result?.ok) return;
    const chosen = result.items.filter(it => picks.has(it.id) && !inCart.has(it.id));
    if (chosen.length === 0) {
      onPushToast?.("Nothing selected to add", "error");
      return;
    }
    onAddBundle(chosen.map(it => ({ testId: it.id, name: it.name, price: it.price, kind: it.kind })), result.code.code);
    setResult(null);
    setInput("");
    setPicks(new Set());
  };

  return (
    <div className={"atp-booking" + (className ? " " + className : "")}>
      <div className="atp-booking-intro">
        <I.Ticket size={14} />
        <div>
          <strong>{introTitle}</strong>
          <p>{introText}</p>
        </div>
      </div>

      <div className="atp-booking-input">
        <input
          type="text"
          placeholder="BC-XXXXXXX-XXXX"
          value={input}
          onChange={e => { setInput(formatBookingCode(e.target.value)); if (result) setResult(null); }}
          onKeyDown={e => { if (e.key === "Enter") check(); }}
          inputMode="text"
          maxLength={15}
          spellCheck={false}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => check()}>
          <I.Check size={11} /> Check
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => check("BC-2026042-DIA3")} title="Simulate scanning a booking QR/barcode">
          <I.Scan size={11} /> Scan booking code
        </button>
      </div>

      {result && !result.ok && (
        <div className="atp-booking-error">
          <I.XCircle size={12} /> {result.message}
        </div>
      )}

      {result?.ok && (
        <div className="atp-booking-result">
          <div className="atp-booking-result-head">
            <span className="atp-booking-tag"><I.Check size={10} strokeWidth={3} /> Code accepted</span>
            <span className="atp-booking-meta">Prescribed by {result.code.doctor} · {result.code.issuedAt}</span>
          </div>
          <div className="atp-booking-rows">
            {result.items.map(it => {
              const already = inCart.has(it.id);
              const checked = !already && picks.has(it.id);
              return (
                <label key={it.id} className={"atp-booking-row" + (already ? " is-incart" : "")}>
                  <input
                    type="checkbox"
                    checked={checked || already}
                    disabled={already}
                    onChange={() => togglePick(it.id)}
                  />
                  <span className="atp-booking-row-name">{it.name}</span>
                  <span className="atp-booking-row-price">{fmtPrice(it.price, ccy)}</span>
                  {already && <span className="atp-booking-row-incart">In cart</span>}
                </label>
              );
            })}
          </div>
          <div className="atp-booking-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setInput(""); setPicks(new Set()); }}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={addAll} disabled={picks.size === 0}>
              <I.Plus size={11} /> Add {picks.size} to cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// === Filter bar — Spec v12 §7 (designed down) ===
//   Original spec called for a histogram + dual-handle slider + numeric inputs
//   per-filter. In a clinical-flow context that's overkill: nurses pick 1–3
//   tests per visit and don't fine-tune budget ranges. So we collapsed it to
//   a single row of preset chips (covers ~95% of intent) plus an optional
//   coverage row when insurance is on file. Filter chrome should never
//   dominate the content it filters.
function CatalogueFilterBar({
  priceRange, setPriceRange,
  coverageFilter, setCoverageFilter,
  hasInsurance, maxPrice, ccy = "USD"
}) {
  const fmt = (usd) => ccy === "KHR"
    ? "៛" + Math.round((usd || 0) * KHR_RATE).toLocaleString()
    : "$" + Math.round(usd || 0);
  const setRange = (lo, hi) => setPriceRange([lo, hi]);
  const reset = () => { setPriceRange([0, maxPrice]); setCoverageFilter("all"); };
  const isFiltered = priceRange[0] !== 0 || priceRange[1] !== maxPrice || coverageFilter !== "all";
  const pricePresets = [
    { id: "all",      label: "Any",          range: [0, maxPrice] },
    { id: "free",     label: "Free",         range: [0, 0] },
    { id: "routine",  label: `≤ ${fmt(25)}`,  range: [0, Math.min(25, maxPrice)] },
    { id: "mid",      label: `${fmt(25)}–${fmt(50)}`, range: [25, Math.min(50, maxPrice)] },
    { id: "high",     label: `${fmt(50)}+`,   range: [50, maxPrice] },
  ];
  const activePreset = pricePresets.find(p => p.range[0] === priceRange[0] && p.range[1] === priceRange[1])?.id || null;
  const coverageOpts = [
    { id: "all", label: "All" },
    { id: "covered", label: "Covered" },
    { id: "not-covered", label: "Not covered" },
  ];
  return (
    <div className="atp-filterbar" role="region" aria-label="Catalogue filters">
      <I.Filter size={11} className="atp-filterbar-ico" aria-hidden="true" />
      <span className="atp-filterbar-label">Price</span>
      <div className="atp-filterbar-chips" role="group" aria-label="Price filter">
        {pricePresets.map(preset => (
          <button
            key={preset.id}
            type="button"
            className={"atp-filter-chip" + (activePreset === preset.id ? " is-active" : "")}
            onClick={() => setRange(preset.range[0], preset.range[1])}
            aria-pressed={activePreset === preset.id}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <span className="atp-filterbar-sep" aria-hidden="true" />
      <span className="atp-filterbar-label">Coverage</span>
      <div className="atp-filterbar-chips" role="group" aria-label="Coverage filter">
        {coverageOpts.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={"atp-filter-chip" + (coverageFilter === opt.id ? " is-active" : "")}
            onClick={() => hasInsurance && setCoverageFilter(opt.id)}
            aria-pressed={coverageFilter === opt.id}
            disabled={!hasInsurance}
            title={!hasInsurance ? "Add an eligible insurance policy to filter by coverage" : ""}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {isFiltered && (
        <button type="button" className="atp-filterbar-reset" onClick={reset} title="Clear all filters">
          <I.X size={10} /> Reset
        </button>
      )}
      {isFiltered && (
        <div className="atp-active-filters" aria-label="Active filters">
          {(priceRange[0] !== 0 || priceRange[1] !== maxPrice) && (
            <button type="button" onClick={() => setRange(0, maxPrice)}>{fmt(priceRange[0])}–{fmt(priceRange[1])} <I.X size={9} /></button>
          )}
          {coverageFilter !== "all" && (
            <button type="button" onClick={() => setCoverageFilter("all")}>{coverageFilter === "covered" ? "Covered only" : "Not covered"} <I.X size={9} /></button>
          )}
        </div>
      )}
    </div>
  );
}

// === Main panel ===
export function AddTestsPanel({ patient, onAdd, onRemove, onPushToast, ccy = "USD", onCcyToggle }) {
  const buckets = useAIRecommendations(patient);
  const priors = patient.priorResults || [];
  const inCart = useMemo(() => new Set((patient.cart?.items || []).map(i => i.id)), [patient.cart]);
  const insurance = patient.insurance || [];
  const hasInsurance = insurance.length > 0;

  // Visibility signals — decide which left-panel sections appear.
  const aiTotal = buckets.reduce((n, b) => n + b.items.length, 0);
  const hasSmartSignal = priors.length > 0 || aiTotal > 0;

  const visibleViews = useMemo(() => VIEWS.filter(v => {
    if (v.id === "smart" && !hasSmartSignal) return false;
    if (v.id === "previous" && priors.length === 0) return false;
    return true;
  }), [hasSmartSignal, priors.length]);

  const defaultView = hasSmartSignal ? "smart" : "panel-general-health";
  const [view, setView] = useState(defaultView);
  const [search, setSearch] = useState("");
  const [whyOpenId, setWhyOpenId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  // Mobile category picker — collapsed pill trigger + popover grid.
  // Replaces the horizontal scroll bar so nurses don't have to hunt for
  // a category that's offscreen.
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const mobilePickerRef = useRef(null);
  // Spec v12 §7 — catalogue filters live above the test list
  const maxPrice = useMemo(() => Math.ceil(Math.max(...ORDER_CATALOG.map(c => c.price || 0))), []);
  const [priceRange, setPriceRange] = useState([0, maxPrice]);
  const [coverageFilter, setCoverageFilter] = useState("all");
  const searchRef = useRef(null);
  const rowsRef = useRef(null);

  const activeViewDef = VIEWS.find(v => v.id === view) || VIEWS[0];
  const isCatalogueView = activeViewDef.group === "catalogue" || activeViewDef.group === "panels";
  const hasGlobalSearch = !!search.trim();
  const showBundleView = view === "bundles" && !hasGlobalSearch;

  // If active view becomes hidden (e.g. after data update) reset to the first diagnostic panel.
  useEffect(() => {
    if (!visibleViews.find(v => v.id === view)) setView(defaultView);
  }, [visibleViews, view, defaultView]);

  const rawRows = useRows({ view, search, patient, buckets, priors, inCart });
  // Apply catalogue filters (price range + coverage) only for catalogue views.
  const rows = useMemo(() => {
    if (!isCatalogueView) return rawRows;
    return rawRows.filter(r => {
      const p = r.price || 0;
      if (p < priceRange[0] || p > priceRange[1]) return false;
      if (coverageFilter === "all") return true;
      const cov = getCoverage(r.id, insurance);
      if (coverageFilter === "covered") return cov?.kind === "covered";
      if (coverageFilter === "not-covered") return cov?.kind === "not-covered" || cov?.kind === "unconfirmed";
      return true;
    });
  }, [rawRows, isCatalogueView, priceRange, coverageFilter, insurance]);
  const bundleRows = useMemo(() => {
    const all = buildBundleRows({ inCart });
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.purpose.toLowerCase().includes(q) ||
      b.items.some(it => it.name.toLowerCase().includes(q))
    );
  }, [inCart, search]);
  const showGlobalBundleResults = hasGlobalSearch && bundleRows.length > 0;

  // counts per view tab — small numerical hint that helps the user choose
  const counts = useMemo(() => {
    const out = {};
    out.smart = (() => {
      const s = new Set();
      priors.forEach(p => s.add(p.testId));
      buckets.forEach(b => b.items.forEach(i => s.add(i.testId)));
      return s.size;
    })();
    out.bundles = BUNDLES.length;
    out.previous = priors.length;
    ["visit","lab","imaging","ecg","vitals","telecon"].forEach(k => {
      out[k] = ORDER_CATALOG.filter(c => c.kind === k).length;
    });
    PANEL_CATEGORIES.forEach(panel => {
      out[`panel-${panel.id}`] = getPanelItems(panel.id).length;
    });
    return out;
  }, [buckets, priors]);

  const toggleWhy = useCallback((id) => {
    setWhyOpenId(prev => prev === id ? null : id);
  }, []);
  const pushAddedToast = (text, result) => {
    if (result?.deferred) return;
    onPushToast?.(text, "success", result?.undo ? { actionLabel: "Undo", onAction: result.undo } : undefined);
  };

  const addOne = (row) => {
    if (row.unavailable) {
      onPushToast?.(`${row.name} is unavailable · use Notify me`, "error");
      return;
    }
    const sourceEl = rowsRef.current?.querySelector(`[data-row-id="${row.id}"]`);
    flyToCart(sourceEl, { name: row.name, kind: row.kind });
    const result = onAdd?.([{ testId: row.id, name: row.name, price: row.price, kind: row.kind }]);
    pushAddedToast(`${row.name} added`, result);
  };
  const removeOne = (row) => {
    const result = onRemove?.(row.id, row);
    if (result?.deferred) return;
    onPushToast?.(`${row.name} removed`, "success", result?.undo ? { actionLabel: "Undo", onAction: result.undo } : undefined);
  };
  const orderSameAsLast = (e) => {
    if (priors.length === 0) return;
    const items = priors
      .filter(p => !inCart.has(p.testId))
      .map(p => ({ testId: p.testId, name: p.testName, price: p.price, kind: "lab" }));
    if (items.length === 0) {
      onPushToast?.("All previous tests already in cart", "error");
      return;
    }
    const fallback = e?.currentTarget;
    items.forEach((it, i) => {
      const el = rowsRef.current?.querySelector(`[data-row-id="${it.testId}"]`) || fallback;
      window.setTimeout(() => flyToCart(el, { name: it.name, kind: it.kind }), i * 70);
    });
    const result = onAdd?.(items);
    pushAddedToast(`${items.length} test${items.length > 1 ? "s" : ""} re-ordered`, result);
  };

  const addBundle = (bundle) => {
    const items = bundle.items
      .filter(it => !inCart.has(it.id))
      .filter(it => !it.unavailable)
      .map(it => ({ testId: it.id, name: it.name, price: it.price, kind: it.kind }));
    if (items.length === 0) {
      onPushToast?.("All bundle tests already in cart", "error");
      return;
    }
    // Toss them out of the bundle card itself so the user sees a clean visual.
    const sourceEl = rowsRef.current?.querySelector(`[data-bundle-id="${bundle.id}"]`);
    items.forEach((it, i) => {
      window.setTimeout(() => flyToCart(sourceEl, { name: it.name, kind: it.kind }), i * 80);
    });
    const result = onAdd?.(items);
    pushAddedToast(`${bundle.name} added · ${items.length} test${items.length > 1 ? "s" : ""}`, result);
  };

  const notifyUnavailable = (row) => {
    onPushToast?.(`${row.name} flagged for follow-up when available`, "success");
  };

  // Keep highlight valid when rows change.
  useEffect(() => {
    if (rows.length === 0) { setHighlightId(null); return; }
    if (!rows.find(r => r.id === highlightId)) setHighlightId(rows[0].id);
  }, [rows, highlightId]);

  // Scroll the highlighted row into view.
  useEffect(() => {
    if (!highlightId || !rowsRef.current) return;
    const el = rowsRef.current.querySelector(`[data-row-id="${highlightId}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightId]);

  // Global keyboard handler — only active while AddTestsPanel is mounted (Step 4).
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      const tag = (target?.tagName || "").toLowerCase();
      const inSearch = target === searchRef.current;
      const isTyping = (tag === "input" || tag === "textarea" || target?.isContentEditable) && !inSearch;
      // Ignore key combos that include Cmd/Ctrl (besides our own shortcuts) when typing in non-search inputs
      if (isTyping) return;

      // / focuses search
      if (e.key === "/" && !inSearch) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // Esc — staged clear
      if (e.key === "Escape") {
        if (whyOpenId) { e.preventDefault(); setWhyOpenId(null); return; }
        if (search) { e.preventDefault(); setSearch(""); return; }
        if (inSearch) { e.preventDefault(); searchRef.current?.blur(); return; }
        return;
      }

      // Number keys 1-9 — switch Smart sources only (not when typing in search)
      if (!inSearch && /^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const idx = parseInt(e.key, 10) - 1;
        const tgt = smartViews[idx];
        if (tgt) {
          e.preventDefault();
          setView(tgt.id);
          setSearch("");
          setWhyOpenId(null);
        }
        return;
      }

      // Arrows — navigate row highlight (works inside search too).
      // Blur the search on arrow nav so subsequent Space/Enter act on the
      // highlighted row instead of being typed into the input.
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (rows.length === 0) return;
        e.preventDefault();
        if (inSearch) searchRef.current?.blur();
        const idx = rows.findIndex(r => r.id === highlightId);
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const next = idx === -1
          ? (dir === 1 ? 0 : rows.length - 1)
          : (idx + dir + rows.length) % rows.length;
        setHighlightId(rows[next].id);
        return;
      }

      // Space — toggle pick on highlighted row (not while typing in search)
      if (e.key === " " && !inSearch && highlightId) {
        e.preventDefault();
        const r = rows.find(x => x.id === highlightId);
        if (r && !r.unavailable) {
          if (r.inCart) removeOne(r);
          else addOne(r);
        }
        return;
      }

      // Enter / Shift+Enter
      if (e.key === "Enter") {
        if (e.shiftKey) {
          // Shift+Enter — select-and-continue: toggle pick + move down
          if (highlightId) {
            e.preventDefault();
            const r = rows.find(x => x.id === highlightId);
            if (r && !r.unavailable) {
              if (r.inCart) removeOne(r);
              else addOne(r);
            }
            const idx = rows.findIndex(x => x.id === highlightId);
            const next = idx === -1 ? 0 : (idx + 1) % rows.length;
            setHighlightId(rows[next]?.id || null);
          }
          return;
        }
        // Plain Enter
        if (highlightId) {
          e.preventDefault();
          const r = rows.find(x => x.id === highlightId);
          if (r && !r.unavailable) {
            if (r.inCart) removeOne(r);
            else addOne(r);
          }
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // Group visible views for the left panel — Smart sources at top, Catalogue
  // specialties below a divider. Mirrors spec §Step 4 layout.
  const smartViews = visibleViews.filter(v => v.group === "smart");
  const catalogueViews = visibleViews.filter(v => v.group === "panels");

  // Close mobile picker on Escape or outside click.
  useEffect(() => {
    if (!mobilePickerOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobilePickerOpen(false); };
    const onDown = (e) => {
      if (mobilePickerRef.current && !mobilePickerRef.current.contains(e.target)) {
        setMobilePickerOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [mobilePickerOpen]);
  // When switching view, collapse the picker and reset search/why.
  const selectView = (id) => {
    setView(id);
    setSearch("");
    setWhyOpenId(null);
    setMobilePickerOpen(false);
  };
  const activeView = visibleViews.find(v => v.id === view) || visibleViews[0];
  const ActiveIco = (activeView && I[activeView.icon]) || I.Sparkles;
  const activeCount = activeView ? (counts[activeView.id] || 0) : 0;

  return (
    <section className="card-soft atp atp-v3">
      {/* Mobile-only category picker — replaces the horizontal scroll bar.
         Collapsed: a single pill showing the active category. Expanded:
         a 2-column grid of all categories so the nurse can see every option
         at once without sideways scrolling. */}
      <div
        className={"atp-mobile-picker" + (mobilePickerOpen ? " is-open" : "")}
        ref={mobilePickerRef}
      >
        <button
          type="button"
          className="atp-mobile-trigger"
          onClick={() => setMobilePickerOpen(o => !o)}
          aria-expanded={mobilePickerOpen}
          aria-controls="atp-mobile-grid"
          aria-label={`Category: ${activeView?.label || "Smart"}. Tap to change.`}
        >
          <span className="atp-mobile-trigger-ico"><ActiveIco size={14} /></span>
          <span className="atp-mobile-trigger-label">{activeView?.label || "Smart"}</span>
          {activeCount > 0 && (
            <span className="atp-mobile-trigger-count">{fmtCount(activeCount)}</span>
          )}
          <I.ChevronDown
            size={14}
            className="atp-mobile-trigger-chev"
            style={{ transform: mobilePickerOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {mobilePickerOpen && (
          <div id="atp-mobile-grid" className="atp-mobile-grid" role="listbox" aria-label="Pick a category">
            {smartViews.length > 0 && (
              <>
                <div className="atp-mobile-grouplabel">Smart sources</div>
                <div className="atp-mobile-cells">
                  {smartViews.map(v => {
                    const Ico = I[v.icon] || I.Sparkles;
                    const count = counts[v.id] || 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="option"
                        aria-selected={view === v.id}
                        className={"atp-mobile-cell" + (view === v.id ? " is-active" : "") + (v.id === "smart" ? " is-smart" : "")}
                        onClick={() => selectView(v.id)}
                      >
                        <Ico size={15} />
                        <span className="atp-mobile-cell-label">{v.label}</span>
                        {count > 0 && (
                          <span className="atp-mobile-cell-count">{fmtCount(count)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {catalogueViews.length > 0 && (
              <>
                <div className="atp-mobile-grouplabel">Panels</div>
                <div className="atp-mobile-cells">
                  {catalogueViews.map(v => {
                    const Ico = I[v.icon] || I.FlaskConical;
                    const count = counts[v.id] || 0;
                    const meta = SPECIALTY_META[v.specialty];
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="option"
                        aria-selected={view === v.id}
                        className={"atp-mobile-cell" + (view === v.id ? " is-active" : "")}
                        onClick={() => selectView(v.id)}
                        style={meta ? { "--cell-accent": meta.color } : undefined}
                      >
                        <Ico size={14} />
                        <span className="atp-mobile-cell-label">{v.label}</span>
                        <span className="atp-mobile-cell-count">{fmtCount(count)}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Spec v12 §Step 4: left side panel + main content (desktop layout) */}
      <div className="atp-shell">
        <aside className="atp-side" role="navigation" aria-label="Catalogue sections">
          {smartViews.length > 0 && (
            <div className="atp-side-group">
              {smartViews.map((v, i) => {
                const Ico = I[v.icon] || I.Sparkles;
                const count = counts[v.id] || 0;
                const keyHint = i < 9 ? String(i + 1) : null;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={"atp-side-item" + (view === v.id ? " is-active" : "") + (v.id === "smart" ? " is-smart" : "")}
                    onClick={() => selectView(v.id)}
                    title={keyHint ? `${v.label} · press ${keyHint}` : v.label}
                  >
                    <Ico size={13} />
                    <span className="atp-side-label">{v.label}</span>
                    {count > 0 && <span className="atp-side-count">{fmtCount(count)}</span>}
                    {keyHint && <kbd className="atp-side-key">{keyHint}</kbd>}
                  </button>
                );
              })}
            </div>
          )}
          {catalogueViews.length > 0 && (
            <>
              {smartViews.length > 0 && <div className="atp-side-divider" aria-hidden="true" />}
              <div className="atp-side-group">
                <div className="atp-side-grouplabel">Panels</div>
                {catalogueViews.map((v, i) => {
                  const Ico = I[v.icon] || I.FlaskConical;
                  const count = counts[v.id] || 0;
                  const meta = SPECIALTY_META[v.specialty];
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={"atp-side-item" + (view === v.id ? " is-active" : "")}
                      onClick={() => selectView(v.id)}
                      title={v.label}
                      style={meta ? { "--side-accent": meta.color } : undefined}
                    >
                      <Ico size={15} />
                      <span className="atp-side-label">{v.label}</span>
                      <span className="atp-side-count">{fmtCount(count)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        <div className="atp-main">
          {/* Toolbar — search + contextual action + currency */}
          <div className="atp-toolbar">
            <div className="atp-search">
              <I.Search size={11} className="atp-search-ico" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search test, service, package"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {!search && (
                <span className="atp-search-hint" aria-hidden="true"><Kbd>/</Kbd></span>
              )}
              {search && (
                <button type="button" className="atp-search-clear" onClick={() => setSearch("")}>
                  <I.X size={10} />
                </button>
              )}
            </div>
            {view === "previous" && priors.length > 0 && (
              <button type="button" className="atp-toolbar-action" onClick={orderSameAsLast}>
                <I.RefreshCw size={11} /> Order same as last visit
              </button>
            )}
            {onCcyToggle && (
              <div className="atp-ccy" role="group" aria-label="Display currency">
                {["USD", "KHR"].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={"atp-ccy-tab" + (ccy === c ? " is-active" : "")}
                    onClick={() => onCcyToggle(c)}
                    aria-pressed={ccy === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter bar — only for catalogue views */}
          {isCatalogueView && (
            <CatalogueFilterBar
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              coverageFilter={coverageFilter}
              setCoverageFilter={setCoverageFilter}
              hasInsurance={hasInsurance}
              maxPrice={maxPrice}
              ccy={ccy}
            />
          )}

          <div className="atp-hints" aria-hidden="true">
            <span><Kbd>/</Kbd> search</span>
            <span><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span><Kbd>Space</Kbd> add/remove</span>
            <span><Kbd>Enter</Kbd> add/remove</span>
            <span><Kbd>⇧</Kbd>+<Kbd>Enter</Kbd> add/remove &amp; next</span>
            <span><Kbd>Esc</Kbd> clear</span>
          </div>

          {/* Rows — bundles render as cards; everything else uses TestRow */}
          <div className={"atp-rows" + (showBundleView ? " is-bundles" : "")} ref={rowsRef}>
              {showBundleView ? (
                bundleRows.length === 0 ? (
                  <div className="atp-empty">
                    <I.Inbox size={16} />
                    <span>{search ? "No bundles match your search" : "No bundles configured"}</span>
                  </div>
                ) : (
                  bundleRows.map(bundle => (
                    <div key={bundle.id} data-bundle-id={bundle.id}>
                      <BundleRow
                        bundle={bundle}
                        ccy={ccy}
                        inCart={inCart}
                        onAddBundle={addBundle}
                      />
                    </div>
                  ))
                )
              ) : (
                <>
                  {showGlobalBundleResults && (
                    <div className="atp-global-bundles">
                      {bundleRows.map(bundle => (
                        <div key={bundle.id} data-bundle-id={bundle.id}>
                          <BundleRow
                            bundle={bundle}
                            ccy={ccy}
                            inCart={inCart}
                            onAddBundle={addBundle}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {rows.length === 0 ? (
                    !showGlobalBundleResults && (
                      <div className="atp-empty">
                        <I.Inbox size={16} />
                        <span>{search ? "No tests match your search" : "No tests match your filters"}</span>
                      </div>
                    )
                  ) : (
                    rows.map(row => (
                      <TestRow
                        key={row.id}
                        row={row}
                        highlighted={highlightId === row.id}
                        onAddOne={addOne}
                        onRemoveOne={removeOne}
                        onNotifyUnavailable={notifyUnavailable}
                        whyOpen={whyOpenId === row.id}
                        onToggleWhy={toggleWhy}
                        ccy={ccy}
                        coverage={getCoverage(row.id, insurance)}
                        specialtyMeta={getSpecialtyMeta(row)}
                      />
                    ))
                  )}
                </>
              )}
          </div>
        </div>
      </div>
    </section>
  );
}
