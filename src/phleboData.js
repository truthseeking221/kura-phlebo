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
//
// `inversions` follows CLSI H3-A6 / typical manufacturer guidance. Skipping
// inversions = clotted CBC, failed PT/INR, etc — phlebotomist always
// confirms after collection.
//
// `timeLimitMin` (nullable) is the post-collection processing window. UI
// starts a countdown when the sample is collected; chip turns amber under
// 10 min remaining and red under 5 min so the operator routes it to the
// centrifuge/lab in time.
export const TUBE_CATALOG = [
  { key: "yellow-sps", order: 1, color: "#F4C842", stripeColor: "#E5B324", stopperLabel: "Yellow (SPS)", additive: "Sodium polyanethol sulfonate", short: "SPS",       inversions: 8, timeLimitMin: null, handling: ["Mix gently — do not shake", "Send to lab for incubation immediately", "Do NOT refrigerate"] },
  { key: "light-blue", order: 2, color: "#7CC4F2", stripeColor: "#3DA0E1", stopperLabel: "Light Blue",    additive: "Sodium citrate (3.2%)",          short: "Citrate",   inversions: 4, timeLimitMin: 30,   handling: ["Fill exactly to mark — under-fill voids PT/INR", "Centrifuge within 30 min", "Keep at room temperature"] },
  { key: "red",        order: 3, color: "#E55353", stripeColor: "#B83D3D", stopperLabel: "Red",           additive: "None / clot activator",          short: "Plain",     inversions: 5, timeLimitMin: null, handling: ["Allow to clot 30 min upright before centrifuging"] },
  { key: "gold-sst",   order: 4, color: "#E2B53C", stripeColor: "#B0892A", stopperLabel: "Gold / SST",    additive: "Clot activator + gel",           short: "SST",       inversions: 5, timeLimitMin: 30,   handling: ["Allow 30 min clot time", "Centrifuge within 30–60 min", "Keep upright"] },
  { key: "green",      order: 5, color: "#3FB97A", stripeColor: "#2D8A57", stopperLabel: "Green",         additive: "Lithium heparin ± gel",          short: "LiHep",     inversions: 8, timeLimitMin: 30,   handling: ["Mix immediately to prevent clotting", "Centrifuge within 30 min for stat chemistry"] },
  { key: "gray-green", order: 6, color: "#7FA68A", stripeColor: "#5C8266", stopperLabel: "Gray-Green",    additive: "Sodium heparin",                 short: "NaHep",     inversions: 8, timeLimitMin: 30,   handling: ["Mix immediately", "Send chilled if HLA typing"] },
  { key: "lavender",   order: 7, color: "#A77BBF", stripeColor: "#7E579A", stopperLabel: "Lavender",      additive: "K₂ EDTA / K₃ EDTA",              short: "EDTA",      inversions: 8, timeLimitMin: null, handling: ["Mix thoroughly — clots invalidate CBC", "Stable at room temp 24h"] },
  { key: "pink",       order: 8, color: "#E89AB5", stripeColor: "#C26F8B", stopperLabel: "Pink",          additive: "K₂ EDTA",                        short: "EDTA-Pink", inversions: 8, timeLimitMin: null, handling: ["Mix thoroughly", "Label with 2 patient identifiers — blood bank requirement"] },
  { key: "white",      order: 9, color: "#EAEAEA", stripeColor: "#B9B9B9", stopperLabel: "White / Pearl", additive: "K₂ EDTA + gel",                  short: "PCR",       inversions: 8, timeLimitMin: null, handling: ["Avoid freeze/thaw cycles", "Process per molecular SOP"] },
  { key: "dark-gray",  order: 10, color: "#4D5566", stripeColor: "#2E3340", stopperLabel: "Dark Gray",    additive: "Sodium fluoride / K oxalate",    short: "NaF",       inversions: 8, timeLimitMin: 30,   handling: ["Mix immediately to inhibit glycolysis", "Process within 30 min for accurate glucose"] },
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
  {
    id: "p-006",
    pid: "P123461",
    name: "Srey Mom",
    initials: "SM",
    avatarColor: "av-purple",
    sex: "F",
    dob: "1982-12-09",
    mobile: "+855 15 808 221",
    orderId: "#4526",
    checkInAt: "07:34",
    waitingMinutes: 47,
    journey: { identity: "done", vitals: "pending", phlebo: "waiting" },
    fasting: "8-12h",
    allergies: [],
    samples: [
      { id: "660100173101", tube: "gold-sst", tests: ["Liver function", "Electrolytes"], volumeMl: 4, container: "4mL SST",  stat: false, status: "generated" },
      { id: "660100173102", tube: "lavender", tests: ["CBC"],                           volumeMl: 3, container: "3mL EDTA", stat: false, status: "generated" },
    ],
  },
  {
    id: "p-007",
    pid: "P123462",
    name: "Vuthy Sok",
    initials: "VS",
    avatarColor: "av-blue",
    sex: "M",
    dob: "1971-05-18",
    mobile: "+855 77 240 919",
    orderId: "#4527",
    checkInAt: "07:49",
    waitingMinutes: 31,
    journey: { identity: "done", vitals: "done", phlebo: "pending" },
    fasting: "not-fasting",
    allergies: ["Iodine"],
    samples: [
      { id: "660100173201", tube: "green",    tests: ["STAT electrolytes"], volumeMl: 4, container: "4mL LiHep", stat: true,  status: "generated" },
      { id: "660100173202", tube: "gold-sst", tests: ["Troponin I"],        volumeMl: 4, container: "4mL SST",   stat: true,  status: "generated" },
    ],
    vitals: {
      heightCm: 168, weightKg: 69, hr: 96, bpSys: 146, bpDia: 88, tempC: 37.1, spo2: 97, breathing: 18, painVas: 3, fasting: "not-fasting",
    },
  },
  {
    id: "p-008",
    pid: "P123463",
    name: "Hana Kim",
    initials: "HK",
    avatarColor: "av-pink",
    sex: "F",
    dob: "1999-03-27",
    mobile: "+855 12 621 004",
    orderId: "#4528",
    checkInAt: "08:09",
    waitingMinutes: 18,
    journey: { identity: "done", vitals: "pending", phlebo: "waiting" },
    fasting: "<8h",
    allergies: [],
    samples: [
      { id: "660100173301", tube: "lavender", tests: ["CBC", "Ferritin"], volumeMl: 3, container: "3mL EDTA", stat: false, status: "generated" },
      { id: "660100173302", tube: "gold-sst", tests: ["Iron studies"],    volumeMl: 4, container: "4mL SST",  stat: false, status: "generated" },
    ],
  },
  {
    id: "p-009",
    pid: "P123464",
    name: "Rina Ouk",
    initials: "RO",
    avatarColor: "av-orange",
    sex: "F",
    dob: "1960-08-11",
    mobile: "+855 93 411 208",
    orderId: "#4529",
    checkInAt: "07:10",
    waitingMinutes: 72,
    journey: { identity: "done", vitals: "done", phlebo: "pending" },
    fasting: "≥12h",
    allergies: ["Aspirin"],
    samples: [
      { id: "660100173401", tube: "light-blue", tests: ["PT/INR"],            volumeMl: 2.7, container: "2.7mL Citrate", stat: true,  status: "generated" },
      { id: "660100173402", tube: "lavender",   tests: ["CBC", "HbA1c"],      volumeMl: 3,   container: "3mL EDTA",      stat: false, status: "generated" },
      { id: "660100173403", tube: "dark-gray",  tests: ["Fasting glucose"],   volumeMl: 2,   container: "2mL NaF",       stat: false, status: "generated" },
    ],
    vitals: {
      heightCm: 158, weightKg: 64, hr: 78, bpSys: 128, bpDia: 82, tempC: 36.6, spo2: 98, breathing: 16, painVas: 1, fasting: "≥12h",
    },
  },
  {
    id: "p-010",
    pid: "P123465",
    name: "Marcus Lee",
    initials: "ML",
    avatarColor: "av-green",
    sex: "M",
    dob: "1990-01-19",
    mobile: "+855 96 117 552",
    orderId: "#4530",
    checkInAt: "08:18",
    waitingMinutes: 9,
    journey: { identity: "done", vitals: "pending", phlebo: "waiting" },
    fasting: "not-fasting",
    allergies: [],
    samples: [
      { id: "660100173501", tube: "gold-sst", tests: ["Vitamin D", "B12"], volumeMl: 4, container: "4mL SST", stat: false, status: "generated" },
    ],
  },
  {
    id: "p-011",
    pid: "P123466",
    name: "Chenda Roeun",
    initials: "CR",
    avatarColor: "av-purple",
    sex: "F",
    dob: "1975-06-23",
    mobile: "+855 10 336 118",
    orderId: "#4531",
    checkInAt: "07:27",
    waitingMinutes: 55,
    journey: { identity: "done", vitals: "done", phlebo: "pending" },
    fasting: "8-12h",
    allergies: [],
    samples: [
      { id: "660100173601", tube: "gold-sst", tests: ["Renal profile", "Uric acid"], volumeMl: 4, container: "4mL SST",  stat: false, status: "generated" },
      { id: "660100173602", tube: "lavender", tests: ["CBC"],                       volumeMl: 3, container: "3mL EDTA", stat: false, status: "generated" },
      { id: "660100173603", tube: "gray-green", tests: ["HLA typing"],              volumeMl: 4, container: "4mL NaHep", stat: false, status: "generated" },
    ],
    vitals: {
      heightCm: 160, weightKg: 59, hr: 82, bpSys: 122, bpDia: 78, tempC: 36.7, spo2: 99, breathing: 15, painVas: 0, fasting: "8-12h",
    },
  },
  {
    id: "p-012",
    pid: "P123467",
    name: "Arun Mehta",
    initials: "AM",
    avatarColor: "av-blue",
    sex: "M",
    dob: "1985-10-04",
    mobile: "+855 17 733 904",
    orderId: "#4532",
    checkInAt: "07:58",
    waitingMinutes: 27,
    journey: { identity: "done", vitals: "pending", phlebo: "waiting" },
    fasting: "≥12h",
    allergies: ["Shellfish"],
    samples: [
      { id: "660100173701", tube: "gold-sst",   tests: ["Lipid panel", "CMP"], volumeMl: 4, container: "4mL SST",  stat: false, status: "generated" },
      { id: "660100173702", tube: "dark-gray",  tests: ["Glucose"],            volumeMl: 2, container: "2mL NaF",  stat: false, status: "generated" },
    ],
  },
  {
    id: "p-013",
    pid: "P123468",
    name: "Mei Lin",
    initials: "ML",
    avatarColor: "av-pink",
    sex: "F",
    dob: "1957-02-02",
    mobile: "+855 69 515 808",
    orderId: "#4533",
    checkInAt: "06:59",
    waitingMinutes: 83,
    journey: { identity: "done", vitals: "done", phlebo: "pending" },
    fasting: "not-fasting",
    allergies: ["Latex"],
    samples: [
      { id: "660100173801", tube: "yellow-sps", tests: ["Blood cultures ×2"], volumeMl: 10, container: "10mL SPS",  stat: true,  status: "generated" },
      { id: "660100173802", tube: "green",      tests: ["Lactate"],           volumeMl: 4,  container: "4mL LiHep", stat: true,  status: "generated" },
      { id: "660100173803", tube: "lavender",   tests: ["CBC"],               volumeMl: 3,  container: "3mL EDTA",  stat: true,  status: "generated" },
    ],
    vitals: {
      heightCm: 154, weightKg: 51, hr: 104, bpSys: 152, bpDia: 90, tempC: 37.8, spo2: 95, breathing: 20, painVas: 4, fasting: "not-fasting",
    },
  },
  {
    id: "p-014",
    pid: "P123469",
    name: "Botum Keo",
    initials: "BK",
    avatarColor: "av-orange",
    sex: "M",
    dob: "2001-09-14",
    mobile: "+855 92 105 447",
    orderId: "#4534",
    checkInAt: "08:13",
    waitingMinutes: 14,
    journey: { identity: "done", vitals: "pending", phlebo: "waiting" },
    fasting: "<8h",
    allergies: [],
    samples: [
      { id: "660100173901", tube: "lavender", tests: ["CBC"], volumeMl: 3, container: "3mL EDTA", stat: false, status: "generated" },
    ],
  },
  {
    id: "p-015",
    pid: "P123470",
    name: "Tomas Rivera",
    initials: "TR",
    avatarColor: "av-green",
    sex: "M",
    dob: "1966-04-29",
    mobile: "+855 89 606 711",
    orderId: "#4535",
    checkInAt: "07:41",
    waitingMinutes: 40,
    journey: { identity: "done", vitals: "done", phlebo: "pending" },
    fasting: "8-12h",
    allergies: ["Penicillin"],
    samples: [
      { id: "660100174001", tube: "red",      tests: ["Serology"],                  volumeMl: 5, container: "5mL Plain", stat: false, status: "generated" },
      { id: "660100174002", tube: "gold-sst", tests: ["Comprehensive metabolic"],   volumeMl: 4, container: "4mL SST",   stat: false, status: "generated" },
      { id: "660100174003", tube: "pink",     tests: ["Type and screen"],           volumeMl: 6, container: "6mL EDTA",  stat: true,  status: "generated" },
    ],
    vitals: {
      heightCm: 174, weightKg: 82, hr: 88, bpSys: 138, bpDia: 84, tempC: 36.9, spo2: 97, breathing: 17, painVas: 2, fasting: "8-12h",
    },
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
