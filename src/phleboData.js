// Fixtures for Phlebotomy + Vital Signs portal.
// Mirrors Receptionist tone but slimmer, station-scoped.

export const stations = [
  { id: "PSC-01", labelKey: "station.psc01", caption: "Main station" },
  { id: "PSC-02", labelKey: "station.psc02", caption: "Triage booth" },
  { id: "PSC-03", labelKey: "station.psc03", caption: "Express counter" },
];

export const shifts = [
  { id: "morning",   labelKey: "topbar.shiftMorning", time: "07:00 — 13:00" },
  { id: "afternoon", labelKey: "shift.afternoon",     time: "13:00 — 19:00" },
  { id: "night",     labelKey: "shift.night",         time: "19:00 — 23:00" },
];

// CLSI/WHO Order of Draw catalog. Each entry is a recipe for the tube visual.
// `key` is referenced from sample fixtures.
export const TUBE_CATALOG = [
  { key: "yellow-sps", order: 1, color: "#F4C842", stripeColor: "#E5B324", stopperLabel: "Yellow (SPS)", additive: "Sodium polyanethol sulfonate", short: "SPS" },
  { key: "light-blue", order: 2, color: "#7CC4F2", stripeColor: "#3DA0E1", stopperLabel: "Light Blue",    additive: "Sodium citrate (3.2%)",          short: "Citrate" },
  { key: "red",        order: 3, color: "#E55353", stripeColor: "#B83D3D", stopperLabel: "Red",           additive: "None / clot activator",          short: "Plain" },
  { key: "gold-sst",   order: 4, color: "#E2B53C", stripeColor: "#B0892A", stopperLabel: "Gold / SST",    additive: "Clot activator + gel",           short: "SST" },
  { key: "green",      order: 5, color: "#3FB97A", stripeColor: "#2D8A57", stopperLabel: "Green",         additive: "Lithium heparin ± gel",          short: "LiHep" },
  { key: "gray-green", order: 6, color: "#7FA68A", stripeColor: "#5C8266", stopperLabel: "Gray-Green",    additive: "Sodium heparin",                 short: "NaHep" },
  { key: "lavender",   order: 7, color: "#A77BBF", stripeColor: "#7E579A", stopperLabel: "Lavender",      additive: "K₂ EDTA / K₃ EDTA",              short: "EDTA" },
  { key: "pink",       order: 8, color: "#E89AB5", stripeColor: "#C26F8B", stopperLabel: "Pink",          additive: "K₂ EDTA",                        short: "EDTA-Pink" },
  { key: "white",      order: 9, color: "#EAEAEA", stripeColor: "#B9B9B9", stopperLabel: "White / Pearl", additive: "K₂ EDTA + gel",                  short: "PCR" },
  { key: "dark-gray",  order: 10, color: "#4D5566", stripeColor: "#2E3340", stopperLabel: "Dark Gray",    additive: "Sodium fluoride / K oxalate",    short: "NaF" },
];

export const tubeByKey = (k) => TUBE_CATALOG.find(t => t.key === k);

// Demo queue. Mix of journey states so all UI branches show in mockup.
export const initialQueue = [
  {
    id: "p-001",
    pid: "P123456",
    name: "Maya Tran",
    initials: "MT",
    avatarColor: "av-pink",
    sex: "F",
    dob: "1995-02-14",
    mobile: "+855 12 222 333",
    orderId: "#4521",
    checkInAt: "07:42",
    waitingMinutes: 23,
    journey: { identity: "done", vitals: "pending",  phlebo: "waiting" },
    fasting: "8-12h",
    allergies: ["Penicillin"],
    samples: [
      { id: "660100172636", tube: "gold-sst",  tests: ["Lipid panel", "TFT"],          volumeMl: 4, container: "4mL SST",  stat: false, status: "generated" },
      { id: "660100172637", tube: "lavender",  tests: ["CBC", "HbA1c"],                volumeMl: 3, container: "3mL EDTA", stat: false, status: "generated" },
      { id: "660100172638", tube: "dark-gray", tests: ["Fasting glucose"],             volumeMl: 2, container: "2mL NaF",  stat: false, status: "generated" },
    ],
  },
  {
    id: "p-002",
    pid: "P123457",
    name: "Sophan Chea",
    initials: "SC",
    avatarColor: "av-blue",
    sex: "M",
    dob: "1978-07-03",
    mobile: "+855 96 555 411",
    orderId: "#4522",
    checkInAt: "07:55",
    waitingMinutes: 12,
    journey: { identity: "done", vitals: "done", phlebo: "pending" },
    fasting: "≥12h",
    allergies: [],
    samples: [
      { id: "660100172701", tube: "light-blue", tests: ["PT/INR", "APTT"],             volumeMl: 2.7, container: "2.7mL Citrate", stat: true,  status: "generated" },
      { id: "660100172702", tube: "gold-sst",   tests: ["Comprehensive metabolic"],     volumeMl: 4,   container: "4mL SST",       stat: false, status: "generated" },
      { id: "660100172703", tube: "lavender",   tests: ["CBC"],                         volumeMl: 3,   container: "3mL EDTA",      stat: false, status: "generated" },
    ],
    vitals: {
      heightCm: 172, weightKg: 78, hr: 84, bpSys: 134, bpDia: 86, tempC: 36.8, spo2: 98, breathing: 16, painVas: 2, fasting: "≥12h",
    },
  },
  {
    id: "p-003",
    pid: "P123458",
    name: "Aiko Nakamura",
    initials: "AN",
    avatarColor: "av-purple",
    sex: "F",
    dob: "1989-11-21",
    mobile: "+855 11 998 220",
    orderId: "#4523",
    checkInAt: "07:30",
    waitingMinutes: 38,
    journey: { identity: "done", vitals: "pending", phlebo: "waiting" },
    fasting: "8-12h",
    allergies: ["Latex"],
    samples: [
      { id: "660100172810", tube: "gold-sst",   tests: ["TFT panel"],            volumeMl: 4, container: "4mL SST",  stat: false, status: "generated" },
      { id: "660100172811", tube: "lavender",   tests: ["CBC", "ESR"],           volumeMl: 3, container: "3mL EDTA", stat: false, status: "generated" },
    ],
  },
  {
    id: "p-004",
    pid: "P123459",
    name: "Daro Pich",
    initials: "DP",
    avatarColor: "av-orange",
    sex: "M",
    dob: "2002-04-05",
    mobile: "+855 89 311 902",
    orderId: "#4524",
    checkInAt: "08:01",
    waitingMinutes: 6,
    journey: { identity: "done", vitals: "done", phlebo: "done" },
    fasting: "not-fasting",
    allergies: [],
    samples: [
      { id: "660100172900", tube: "lavender", tests: ["CBC"], volumeMl: 3, container: "3mL EDTA", stat: false, status: "collected", collectedAt: "08:08" },
    ],
    vitals: {
      heightCm: 180, weightKg: 75, hr: 72, bpSys: 118, bpDia: 76, tempC: 36.5, spo2: 99, breathing: 14, painVas: 0, fasting: "not-fasting",
    },
  },
  {
    id: "p-005",
    pid: "P123460",
    name: "Nina Patel",
    initials: "NP",
    avatarColor: "av-green",
    sex: "F",
    dob: "1968-09-30",
    mobile: "+855 70 414 700",
    orderId: "#4525",
    checkInAt: "07:18",
    waitingMinutes: 64,
    journey: { identity: "done", vitals: "pending", phlebo: "waiting" },
    fasting: "≥12h",
    allergies: ["Sulfa drugs"],
    samples: [
      { id: "660100173005", tube: "yellow-sps", tests: ["Blood cultures ×2"], volumeMl: 10, container: "10mL SPS",  stat: true,  status: "generated" },
      { id: "660100173006", tube: "gold-sst",   tests: ["CMP", "CRP"],         volumeMl: 4,  container: "4mL SST",  stat: true,  status: "generated" },
      { id: "660100173007", tube: "lavender",   tests: ["CBC"],                volumeMl: 3,  container: "3mL EDTA", stat: false, status: "generated" },
    ],
  },
];

// Defaults for a freshly opened patient form.
export const emptyVitals = {
  heightCm: "", weightKg: "",
  hr: "", bpSys: "", bpDia: "", tempC: "", spo2: "", breathing: "",
  painVas: 0,
  fasting: null,
  vaccinationOpen: false,
  vaccinationNote: "",
  tempUnit: "C",
};

// Range hints (low, high). Out-of-range = warning, not blocker.
export const VITAL_RANGES = {
  heightCm: [50, 250],
  weightKg: [1, 300],
  hr: [30, 250],
  bpSys: [80, 200],
  bpDia: [40, 130],
  tempC: [34, 42],
  spo2: [85, 100],
  breathing: [8, 35],
};

export function bmiCategory(bmi) {
  if (!bmi || isNaN(bmi)) return null;
  if (bmi < 18.5)  return { label: "Underweight", tone: "info"    };
  if (bmi <= 24.9) return { label: "Normal",      tone: "success" };
  if (bmi <= 29.9) return { label: "Overweight",  tone: "warn"    };
  return            { label: "Obese",        tone: "danger"  };
}

export function calcBMI(heightCm, weightKg) {
  const h = parseFloat(heightCm);
  const w = parseFloat(weightKg);
  if (!h || !w) return null;
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
}

export const FASTING_OPTIONS = [
  { id: "not-fasting", label: "Not fasting" },
  { id: "<8h",         label: "Fasting < 8h" },
  { id: "8-12h",       label: "Fasting 8–12h" },
  { id: "≥12h",        label: "Fasting ≥ 12h" },
];

export const ARM_SITES = [
  "Antecubital fossa", "Forearm", "Dorsal hand", "Other",
];

export const initialNotifications = [
  { id: "n1", title: "Stat order ready",        body: "Patient P123457 awaiting phlebotomy", time: "2m", unread: true,  tone: "warn" },
  { id: "n2", title: "Vitals submitted",        body: "Daro Pich (P123459) routed to phlebo", time: "8m", unread: false, tone: "success" },
  { id: "n3", title: "Tube stock low",          body: "EDTA 3mL — only 14 left at PSC-01",     time: "23m", unread: true, tone: "danger" },
];
