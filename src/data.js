// === Kura Reception — seed data ===
import {
  LAB_CATALOG as STANDARD_LAB_CATALOG,
  LAB_CATEGORIES as STANDARD_LAB_CATEGORIES,
  ORDER_CATALOG as STANDARD_ORDER_CATALOG,
} from "./orderCatalog";

// === Blank-state factory (dev tester) ===
// Returns a patient stripped to first-arrival, no PII captured yet.
// Preserves id/queueNumber/avatarColor so the row stays in the queue.
export function blankPatient(id = "p-blank", queueNumber = "Q-000", avatarColor = "av-blue") {
  return {
    id, queueNumber, avatarColor,
    name: "", initials: "—",
    gender: "—", sexAtBirth: "",
    age: 0, dob: "",
    arrivedAt: "just now",
    arrivedRaw: "Today, just now",
    status: { tone: "info", label: "Awaiting check-in" },
    visitReason: [],
    language: "Khmer",          // default Khmer for blank/manual flow
    countryCode: "+855",
    phoneNumber: "",
    mobile: "",
    telegramHandle: "",
    telegramVerified: false,
    commMethod: "sms",
    otpVerified: false,
    pwaSentAt: null,
    idScanned: false,
    idNumber: "",
    payer: "direct",
    documents: { id: "pending", consent: "pending", insurance: "pending", receipt: "pending" },
    pwaProgress: 0,
    pwaLog: [],
    services: [],
    cart: {
      // Spec v12 §Step 4 "Empty cart — auto-populated defaults":
      // every new visit starts with Vitals + Teleconsult at $0 to nudge
      // the nurse to record vitals and book a tele slot. Both are removable.
      items: [
        { id: "vit-pkg", kind: "vitals", name: "Vital signs package", price: 0, qty: 1, payer: "direct", status: "pending", auto: true },
        { id: "telecon", kind: "telecon", name: "Teleconsultation", price: 0, qty: 1, payer: "direct", status: "pending", auto: true },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "", medicalHistory: "", medications: "",
      allergies: "", notes: "",
    },
    visitDetailsAuthors: {},
    labTests: [],
    insurance: [],
    priorResults: [],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 0,
    handoffStates: ["in-progress", "pending", "pending", "pending"],
    identity: { verified: false },
    manualEntry: false,
  };
}

const seedPatients = [
  {
    id: "p1",
    name: "Maya Tran",
    gender: "Female",
    sexAtBirth: "Female",
    age: 28,
    initials: "MT",
    avatarColor: "av-blue",
    arrivedAt: "09:12 AM",
    queueNumber: "Q-042",
    status: { tone: "info", label: "PWA sent" },
    visitReason: ["General check-up"],
    language: "English",
    countryCode: "+855",
    phoneNumber: "12 345 678",
    mobile: "+855 12 345 678",
    dob: "1996-02-14",
    telegramHandle: "t.me/mayatran",
    telegramVerified: true,
    commMethod: "telegram",
    otpVerified: true,
    pwaSentAt: "09:12 AM",
    idScanned: true,
    idNumber: "012345678",
    payer: "direct",
    documents: { id: "ok", consent: "ok", insurance: "pending", receipt: "pending" },
    pwaProgress: 62,
    pwaLog: [
      { type: "sent",      text: "Link sent by SMS",         time: "09:12 AM", state: "ok" },
      { type: "verified",  text: "OTP verified",             time: "09:13 AM", state: "ok" },
      { type: "pending",   text: "Medical history pending",  time: "62% complete", state: "pending" },
    ],
    services: [
      { name: "CBC",            payer: "Direct Pay", status: "draft", amount: 6 },
      { name: "Glucose Fasting",payer: "Direct Pay", status: "draft", amount: 3 },
      { name: "Vitamin D",      payer: "Direct Pay", status: "draft", amount: 25 },
      { name: "X-ray Chest",    payer: "Direct Pay", status: "draft", amount: 15 },
    ],
    cart: {
      items: [
        { id: "visit-gp", kind: "visit", name: "GP consultation (visit fee)", price: 15, qty: 1, payer: "direct", status: "pending", auto: true },
        { id: "cbc", kind: "lab", name: "Complete Blood Count (CBC)", price: 8, qty: 1, payer: "direct", status: "pending" },
        { id: "glucose", kind: "lab", name: "Blood Glucose (Fasting)", price: 5, qty: 1, payer: "direct", status: "pending", fasting: true },
        { id: "xray-chest", kind: "imaging", name: "X-ray — Chest", price: 15, qty: 1, payer: "direct", status: "pending" },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "Headache and mild fever for 3 days",
      medicalHistory: "Hypertension (controlled), no surgeries",
      medications: "Lisinopril 10mg daily",
      allergies: "Penicillin",
      notes: "",
    },
    labTests: [
      { id: "cbc",     name: "Complete Blood Count (CBC)", price: 8, status: "in-progress" },
      { id: "glucose", name: "Blood Glucose (Fasting)",    price: 5, status: "pending" },
    ],
    insurance: [],
    visitDetailsAuthors: {
      chiefComplaint: "patient",
      medicalHistory: "patient",
      medications: "patient",
      allergies: "patient",
    },
    priorResults: [
      { id: "pr-1", testId: "lipid", testName: "Lipid Panel", visitDate: "2026-01-14", status: "complete", price: 12, sensitive: true },
      { id: "pr-2", testId: "hba1c", testName: "HbA1c (Diabetes)", visitDate: "2026-01-14", status: "complete", price: 11, sensitive: true },
      { id: "pr-3", testId: "cbc", testName: "Complete Blood Count (CBC)", visitDate: "2025-10-04", status: "complete", price: 8, sensitive: false },
    ],
    teleconsult: { status: "booked", slot: { id: "tom_am", hint: "Tomorrow · 09:00–09:30" }, by: "nurse", bookedAt: "2026-04-29T08:30:00Z" },
    handoff: 1,
    handoffStates: ["new","in-progress","pending","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:12 AM",
  },
  {
    id: "p2",
    name: "Bao Nguyen",
    gender: "Male",
    sexAtBirth: "Male",
    age: 35,
    initials: "BN",
    avatarColor: "av-green",
    arrivedAt: "09:05 AM",
    queueNumber: "Q-041",
    status: { tone: "warn", label: "Needs insurance" },
    visitReason: ["Annual physical"],
    language: "Vietnamese",
    countryCode: "+84",
    phoneNumber: "933 222 110",
    mobile: "+84 933 222 110",
    dob: "1989-06-03",
    telegramHandle: "",
    commMethod: "sms",
    otpVerified: true,
    pwaSentAt: "09:05 AM",
    idScanned: true,
    idNumber: "445566778",
    payer: "insurance",
    documents: { id: "ok", consent: "ok", insurance: "pending", receipt: "pending" },
    pwaProgress: 80,
    pwaLog: [
      { type: "sent",     text: "Link sent by SMS",        time: "09:05 AM", state: "ok" },
      { type: "verified", text: "OTP verified",            time: "09:06 AM", state: "ok" },
      { type: "warn",     text: "Insurance card not uploaded", time: "Awaiting", state: "warn" },
    ],
    services: [
      { name: "Lipid Panel", payer: "Insurance",  status: "pending", amount: 12 },
      { name: "ECG",         payer: "Insurance",  status: "pending", amount: 22 },
    ],
    visitDetails: {
      chiefComplaint: "Routine annual physical",
      medicalHistory: "",
      medications: "",
      allergies: "None known",
      notes: "",
    },
    labTests: [
      { id: "lipid", name: "Lipid Panel", price: 12, status: "pending" },
    ],
    insurance: [
      { id: "ins-p2", provider: "Forte Insurance", policyNumber: "FT-00123456", memberName: "Bao Nguyen", memberId: "M-7788991", expiry: "12/2026", coverage: "Outpatient", cardAttached: false },
    ],
    visitDetailsAuthors: {
      chiefComplaint: "patient",
      allergies: "patient",
    },
    priorResults: [
      { id: "pr-b1", testId: "lipid", testName: "Lipid Panel", visitDate: "2025-12-02", status: "complete", price: 12, sensitive: true },
      { id: "pr-b2", testId: "ecg-12", testName: "ECG — 12 lead", visitDate: "2025-12-02", status: "complete", price: 22, sensitive: false },
    ],
    handoff: 1,
    handoffStates: ["done","in-progress","pending","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:05 AM",
  },
  {
    id: "p3",
    name: "Pierre Tison",
    gender: "Male",
    sexAtBirth: "Male",
    age: 31,
    initials: "PT",
    avatarColor: "av-amber",
    arrivedAt: "08:58 AM",
    queueNumber: "Q-040",
    status: { tone: "success", label: "Ready for nurse" },
    visitReason: ["Follow-up"],
    language: "English",
    countryCode: "+855",
    phoneNumber: "77 555 244",
    mobile: "+855 77 555 244",
    dob: "1993-11-22",
    telegramHandle: "t.me/pierret",
    telegramVerified: true,
    commMethod: "telegram",
    otpVerified: true,
    pwaSentAt: "08:58 AM",
    idScanned: true,
    idNumber: "998877665",
    payer: "corporate",
    documents: { id: "ok", consent: "ok", insurance: "ok", receipt: "ok" },
    pwaProgress: 100,
    pwaLog: [
      { type: "sent",     text: "Link sent by SMS",      time: "08:58 AM", state: "ok" },
      { type: "verified", text: "OTP verified",          time: "08:59 AM", state: "ok" },
      { type: "ok",       text: "Medical history complete", time: "09:04 AM", state: "ok" },
    ],
    services: [
      { name: "Blood Pressure",  payer: "Corporate", status: "ready", amount: 0 },
      { name: "Vision Test",     payer: "Corporate", status: "ready", amount: 0 },
    ],
    visitDetails: {
      chiefComplaint: "Follow-up after lipid results last visit",
      medicalHistory: "Borderline cholesterol",
      medications: "None",
      allergies: "None",
      notes: "Patient reports diet changes are working.",
    },
    labTests: [
      { id: "hba1c", name: "HbA1c (Diabetes)", price: 11, status: "complete" },
      { id: "lipid", name: "Lipid Panel",      price: 12, status: "complete" },
    ],
    insurance: [],
    handoff: 2,
    handoffStates: ["done","done","in-progress","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 08:58 AM",
  },
  {
    id: "p4",
    name: "An Le",
    gender: "Female",
    sexAtBirth: "Female",
    age: 42,
    initials: "AL",
    avatarColor: "av-pink",
    arrivedAt: "08:45 AM",
    queueNumber: "Q-039",
    status: { tone: "danger", label: "Missing consent" },
    visitReason: ["X-ray follow-up"],
    language: "Vietnamese",
    countryCode: "+855",
    phoneNumber: "88 102 909",
    mobile: "+855 88 102 909",
    dob: "1982-04-30",
    telegramHandle: "",
    commMethod: "sms",
    otpVerified: false,
    idScanned: true,
    idNumber: "112233445",
    payer: "direct",
    documents: { id: "ok", consent: "pending", insurance: "pending", receipt: "pending" },
    pwaProgress: 45,
    pwaLog: [
      { type: "sent",     text: "Link sent by SMS",  time: "08:45 AM", state: "ok" },
      { type: "verified", text: "OTP verified",      time: "08:46 AM", state: "ok" },
      { type: "danger",   text: "Consent declined — needs counter signature", time: "Blocking", state: "danger" },
    ],
    services: [
      { name: "X-ray Lumbar", payer: "Direct Pay", status: "blocked", amount: 18 },
    ],
    visitDetails: {
      chiefComplaint: "",
      medicalHistory: "",
      medications: "",
      allergies: "",
      notes: "",
    },
    labTests: [],
    insurance: [],
    handoff: 0,
    handoffStates: ["in-progress","blocked","pending","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 08:45 AM",
    exception: "consent",
  },
  {
    id: "p5",
    name: "Sokha Pich",
    gender: "Female",
    sexAtBirth: "Female",
    age: 54,
    initials: "SP",
    avatarColor: "av-purple",
    arrivedAt: "09:22 AM",
    queueNumber: "Q-043",
    status: { tone: "success", label: "Checked in" },
    checkedInAt: "2026-05-02T02:28:00Z",
    visitReason: ["Diabetes follow-up", "HbA1c"],
    language: "Khmer",
    countryCode: "+855",
    phoneNumber: "16 904 221",
    mobile: "+855 16 904 221",
    dob: "1972-09-18",
    telegramHandle: "t.me/sokhapich",
    telegramVerified: true,
    commMethod: "telegram",
    otpVerified: true,
    pwaSentAt: "09:20 AM",
    idScanned: true,
    idNumber: "550091882",
    payer: "direct",
    insuranceAcked: true,
    documents: { id: "ok", consent: "ok", insurance: "pending", receipt: "ok" },
    pwaProgress: 100,
    pwaLog: [
      { type: "sent", text: "Link sent by Telegram", time: "09:20 AM", state: "ok" },
      { type: "verified", text: "Telegram verified", time: "09:21 AM", state: "ok" },
      { type: "ok", text: "Check-in complete", time: "09:28 AM", state: "ok" },
    ],
    services: [
      { name: "HbA1c (Diabetes)", payer: "Direct Pay", status: "paid", amount: 11 },
      { name: "TSH (Thyroid)", payer: "Direct Pay", status: "paid", amount: 14 },
    ],
    cart: {
      items: [
        { id: "hba1c", kind: "lab", name: "HbA1c (Diabetes)", price: 11, qty: 1, payer: "direct", status: "paid" },
        { id: "tsh", kind: "lab", name: "TSH (Thyroid)", price: 14, qty: 1, payer: "direct", status: "paid" },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: "khqr", status: "confirmed", receiptId: "KUR-260502-043", confirmedAt: "2026-05-02T02:27:30Z", amount: 25, currency: "USD", cashier: "Linh Nguyen" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "Diabetes monitoring, no acute symptoms",
      medicalHistory: "Type 2 diabetes",
      medications: "Metformin 500mg twice daily",
      allergies: "None known",
      notes: "Asked for printed receipt.",
    },
    labTests: [
      { id: "hba1c", name: "HbA1c (Diabetes)", price: 11, status: "ordered" },
      { id: "tsh", name: "TSH (Thyroid)", price: 14, status: "ordered" },
    ],
    insurance: [],
    priorResults: [
      { id: "pr-sp1", testId: "hba1c", testName: "HbA1c (Diabetes)", visitDate: "2026-02-12", status: "complete", price: 11, sensitive: true },
      { id: "pr-sp2", testId: "kft", testName: "Kidney Function (KFT)", visitDate: "2026-02-12", status: "complete", price: 13, sensitive: true },
    ],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 3,
    handoffStates: ["done","done","done","done"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:22 AM",
  },
  {
    id: "p6",
    name: "Dara Kim",
    gender: "Male",
    sexAtBirth: "Male",
    age: 46,
    initials: "DK",
    avatarColor: "av-teal",
    arrivedAt: "09:26 AM",
    queueNumber: "Q-044",
    status: { tone: "warn", label: "Orders needed" },
    visitReason: ["Executive check-up", "Returning patient"],
    language: "English",
    countryCode: "+855",
    phoneNumber: "11 600 300",
    mobile: "+855 11 600 300",
    dob: "1980-01-05",
    telegramHandle: "",
    telegramVerified: false,
    commMethod: "sms",
    otpVerified: true,
    pwaSentAt: "09:24 AM",
    idScanned: true,
    idNumber: "810056003",
    payer: "direct",
    insuranceAcked: true,
    documents: { id: "ok", consent: "ok", insurance: "pending", receipt: "pending" },
    pwaProgress: 100,
    pwaLog: [
      { type: "sent", text: "Link sent by SMS", time: "09:24 AM", state: "ok" },
      { type: "verified", text: "OTP verified", time: "09:25 AM", state: "ok" },
      { type: "ok", text: "Review complete", time: "09:26 AM", state: "ok" },
    ],
    services: [],
    cart: {
      // Spec v12 §Step 4 "Empty cart — auto-populated defaults":
      // every new visit starts with Vitals + Teleconsult at $0 to nudge
      // the nurse to record vitals and book a tele slot. Both are removable.
      items: [
        { id: "vit-pkg", kind: "vitals", name: "Vital signs package", price: 0, qty: 1, payer: "direct", status: "pending", auto: true },
        { id: "telecon", kind: "telecon", name: "Teleconsultation", price: 0, qty: 1, payer: "direct", status: "pending", auto: true },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "Annual executive check-up",
      medicalHistory: "No chronic illnesses reported",
      medications: "None",
      allergies: "Shellfish",
      notes: "",
    },
    labTests: [],
    insurance: [],
    priorResults: [
      { id: "pr-dk1", testId: "cbc", testName: "Complete Blood Count (CBC)", visitDate: "2025-08-03", status: "complete", price: 8, sensitive: false },
      { id: "pr-dk2", testId: "lipid", testName: "Lipid Panel", visitDate: "2025-08-03", status: "complete", price: 12, sensitive: true },
      { id: "pr-dk3", testId: "lft", testName: "Liver Function (LFT)", visitDate: "2025-08-03", status: "complete", price: 13, sensitive: true },
    ],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 1,
    handoffStates: ["done","done","done","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:26 AM",
  },
  {
    id: "p7",
    name: "Nary Chea",
    gender: "Female",
    sexAtBirth: "Female",
    age: 33,
    initials: "NC",
    avatarColor: "av-pink",
    arrivedAt: "09:30 AM",
    queueNumber: "Q-045",
    status: { tone: "warn", label: "Verify contact" },
    visitReason: ["Fatigue", "Price estimate"],
    language: "Khmer",
    countryCode: "+855",
    phoneNumber: "92 218 700",
    mobile: "+855 92 218 700",
    dob: "1993-07-21",
    telegramHandle: "",
    telegramVerified: false,
    commMethod: "sms",
    otpVerified: false,
    pwaSentAt: "09:29 AM",
    idScanned: true,
    idNumber: "920218700",
    payer: "direct",
    insuranceAcked: true,
    documents: { id: "ok", consent: "pending", insurance: "pending", receipt: "pending" },
    pwaProgress: 35,
    pwaLog: [
      { type: "sent", text: "Link sent by SMS", time: "09:29 AM", state: "ok" },
      { type: "pending", text: "OTP not verified", time: "Awaiting patient", state: "pending" },
    ],
    services: [
      { name: "Complete Blood Count (CBC)", payer: "Direct Pay", status: "staged", amount: 8 },
      { name: "Ferritin", payer: "Direct Pay", status: "staged", amount: 9 },
    ],
    cart: {
      items: [
        { id: "cbc", kind: "lab", name: "Complete Blood Count (CBC)", price: 8, qty: 1, payer: "direct", status: "pending" },
        { id: "ferritin", kind: "lab", name: "Ferritin", price: 9, qty: 1, payer: "direct", status: "pending" },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "Fatigue and dizziness for two weeks",
      medicalHistory: "",
      medications: "",
      allergies: "",
      notes: "Patient asked for price before OTP verification.",
    },
    labTests: [],
    insurance: [],
    priorResults: [],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 0,
    handoffStates: ["done","in-progress","pending","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:30 AM",
  },
  {
    id: "p8",
    name: "Vannak Sok",
    gender: "Male",
    sexAtBirth: "Male",
    age: 39,
    initials: "VS",
    avatarColor: "av-green",
    arrivedAt: "09:33 AM",
    queueNumber: "Q-046",
    status: { tone: "info", label: "Insurance ready" },
    visitReason: ["Chest discomfort", "Insurance billing"],
    language: "Khmer",
    countryCode: "+855",
    phoneNumber: "70 334 112",
    mobile: "+855 70 334 112",
    dob: "1987-12-11",
    telegramHandle: "t.me/vannaksok",
    telegramVerified: true,
    commMethod: "telegram",
    otpVerified: true,
    pwaSentAt: "09:31 AM",
    idScanned: true,
    idNumber: "703341122",
    payer: "insurance",
    insuranceAcked: true,
    documents: { id: "ok", consent: "ok", insurance: "ok", receipt: "pending" },
    pwaProgress: 90,
    pwaLog: [
      { type: "sent", text: "Link sent by Telegram", time: "09:31 AM", state: "ok" },
      { type: "verified", text: "Telegram verified", time: "09:31 AM", state: "ok" },
      { type: "ok", text: "Insurance card matched", time: "09:33 AM", state: "ok" },
    ],
    services: [
      { name: "ECG — 12 lead", payer: "Insurance", status: "pending", amount: 22 },
      { name: "Lipid Panel", payer: "Insurance", status: "pending", amount: 12 },
    ],
    cart: {
      items: [
        { id: "ecg-12", kind: "ecg", name: "ECG — 12 lead", price: 22, qty: 1, payer: "insurance", status: "pending" },
        { id: "lipid", kind: "lab", name: "Lipid Panel", price: 12, qty: 1, payer: "insurance", status: "pending", fasting: true },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "Mild chest discomfort after exercise",
      medicalHistory: "Family history of hypertension",
      medications: "",
      allergies: "None known",
      notes: "Insurance may partially cover ECG.",
    },
    labTests: [
      { id: "lipid", name: "Lipid Panel", price: 12, status: "pending" },
    ],
    insurance: [
      { id: "ins-vs", provider: "AIA Cambodia", policyNumber: "AIA-883021", memberName: "Vannak Sok", memberId: "AIA-M-20491", expiry: "09/2027", coverage: "Outpatient 80%", cardAttached: true },
    ],
    priorResults: [
      { id: "pr-vs1", testId: "ecg-12", testName: "ECG — 12 lead", visitDate: "2025-11-09", status: "complete", price: 22, sensitive: false },
    ],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 1,
    handoffStates: ["done","done","done","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:33 AM",
  },
  {
    id: "p9",
    name: "Elise Martin",
    gender: "Female",
    sexAtBirth: "Female",
    age: 29,
    initials: "EM",
    avatarColor: "av-amber",
    arrivedAt: "09:37 AM",
    queueNumber: "Q-047",
    status: { tone: "success", label: "Paid" },
    visitReason: ["Travel clearance", "COVID PCR"],
    language: "English",
    countryCode: "+33",
    phoneNumber: "6 44 18 90 20",
    mobile: "+33 6 44 18 90 20",
    dob: "1997-03-09",
    telegramHandle: "",
    telegramVerified: false,
    commMethod: "sms",
    otpVerified: true,
    pwaSentAt: "09:35 AM",
    idScanned: true,
    idNumber: "FR775901",
    payer: "direct",
    insuranceAcked: true,
    documents: { id: "ok", consent: "ok", insurance: "pending", receipt: "ok" },
    pwaProgress: 100,
    pwaLog: [
      { type: "sent", text: "Link sent by SMS", time: "09:35 AM", state: "ok" },
      { type: "verified", text: "OTP verified", time: "09:36 AM", state: "ok" },
      { type: "ok", text: "Payment confirmed", time: "09:38 AM", state: "ok" },
    ],
    services: [
      { name: "COVID-19 PCR", payer: "Direct Pay", status: "paid", amount: 18 },
    ],
    cart: {
      items: [
        { id: "covid", kind: "lab", name: "COVID-19 PCR", price: 18, qty: 1, payer: "direct", status: "paid" },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: "cash", status: "confirmed", receiptId: "KUR-260502-047", confirmedAt: "2026-05-02T02:38:00Z", amount: 18, currency: "USD", tendered: "20", change: 2, cashier: "Linh Nguyen" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "PCR test required for travel",
      medicalHistory: "",
      medications: "",
      allergies: "",
      notes: "Needs result by evening.",
    },
    labTests: [
      { id: "covid", name: "COVID-19 PCR", price: 18, status: "ordered" },
    ],
    insurance: [],
    priorResults: [],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 2,
    handoffStates: ["done","done","done","in-progress"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:37 AM",
  },
  {
    id: "p10",
    name: "Chan Rotha",
    gender: "Male",
    sexAtBirth: "Male",
    age: 61,
    initials: "CR",
    avatarColor: "av-blue",
    arrivedAt: "09:40 AM",
    queueNumber: "Q-048",
    status: { tone: "info", label: "Payment pending" },
    visitReason: ["Kidney follow-up", "KHQR waiting"],
    language: "Khmer",
    countryCode: "+855",
    phoneNumber: "15 221 700",
    mobile: "+855 15 221 700",
    dob: "1965-05-30",
    telegramHandle: "",
    telegramVerified: false,
    commMethod: "sms",
    otpVerified: true,
    pwaSentAt: "09:38 AM",
    idScanned: true,
    idNumber: "152217000",
    payer: "direct",
    insuranceAcked: true,
    documents: { id: "ok", consent: "ok", insurance: "pending", receipt: "pending" },
    pwaProgress: 100,
    pwaLog: [
      { type: "sent", text: "Link sent by SMS", time: "09:38 AM", state: "ok" },
      { type: "verified", text: "OTP verified", time: "09:39 AM", state: "ok" },
      { type: "pending", text: "KHQR waiting", time: "09:40 AM", state: "pending" },
    ],
    services: [
      { name: "Kidney Function (KFT)", payer: "Direct Pay", status: "payment waiting", amount: 13 },
      { name: "Urinalysis", payer: "Direct Pay", status: "payment waiting", amount: 6 },
    ],
    cart: {
      items: [
        { id: "kft", kind: "lab", name: "Kidney Function (KFT)", price: 13, qty: 1, payer: "direct", status: "pending" },
        { id: "urinalysis", kind: "lab", name: "Urinalysis", price: 6, qty: 1, payer: "direct", status: "pending" },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: "khqr", status: "waiting", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "Follow-up for kidney function",
      medicalHistory: "Hypertension",
      medications: "Amlodipine",
      allergies: "",
      notes: "",
    },
    labTests: [],
    insurance: [],
    priorResults: [
      { id: "pr-cr1", testId: "kft", testName: "Kidney Function (KFT)", visitDate: "2026-03-01", status: "complete", price: 13, sensitive: true },
    ],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 1,
    handoffStates: ["done","done","done","pending"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:40 AM",
  },
  {
    id: "p11",
    name: "Srey Mom",
    gender: "Female",
    sexAtBirth: "Female",
    age: 24,
    initials: "SM",
    avatarColor: "av-purple",
    arrivedAt: "09:43 AM",
    queueNumber: "Q-049",
    status: { tone: "danger", label: "Consent required" },
    visitReason: ["Ankle injury", "Imaging consent"],
    language: "Khmer",
    countryCode: "+855",
    phoneNumber: "96 410 021",
    mobile: "+855 96 410 021",
    dob: "2002-02-02",
    telegramHandle: "t.me/sreymom",
    telegramVerified: true,
    commMethod: "telegram",
    otpVerified: true,
    pwaSentAt: "09:41 AM",
    idScanned: true,
    idNumber: "964100210",
    payer: "direct",
    insuranceAcked: true,
    documents: { id: "ok", consent: "pending", insurance: "pending", receipt: "pending" },
    pwaProgress: 85,
    pwaLog: [
      { type: "sent", text: "Link sent by Telegram", time: "09:41 AM", state: "ok" },
      { type: "verified", text: "Telegram verified", time: "09:42 AM", state: "ok" },
      { type: "danger", text: "Imaging consent pending", time: "Blocking payment", state: "danger" },
    ],
    services: [
      { name: "X-ray — Ankle", payer: "Direct Pay", status: "consent pending", amount: 15 },
    ],
    cart: {
      items: [
        { id: "xray-ankle", kind: "imaging", name: "X-ray — Ankle", price: 15, qty: 1, payer: "direct", status: "pending", validationState: "sent" },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "Ankle pain after fall",
      medicalHistory: "",
      medications: "",
      allergies: "",
      notes: "Pregnancy screening required before imaging.",
    },
    labTests: [],
    insurance: [],
    priorResults: [],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 1,
    handoffStates: ["done","done","done","blocked"],
    identity: { verified: true },
    arrivedRaw: "Today, 09:43 AM",
    exception: "consent",
  },
  {
    id: "p12",
    name: "Ahmed Khan",
    gender: "Male",
    sexAtBirth: "Male",
    age: 41,
    initials: "AK",
    avatarColor: "av-teal",
    arrivedAt: "09:47 AM",
    queueNumber: "Q-050",
    status: { tone: "info", label: "Awaiting ID" },
    visitReason: ["Booking follow-up", "VID search case"],
    language: "English",
    countryCode: "+971",
    phoneNumber: "50 902 1144",
    mobile: "+971 50 902 1144",
    dob: "1985-10-18",
    telegramHandle: "",
    telegramVerified: false,
    commMethod: "sms",
    otpVerified: false,
    pwaSentAt: null,
    idScanned: false,
    idNumber: "VID-260502-050",
    payer: "direct",
    insuranceAcked: false,
    documents: { id: "pending", consent: "pending", insurance: "pending", receipt: "pending" },
    pwaProgress: 0,
    pwaLog: [
      { type: "pending", text: "Waiting for National ID scan", time: "Now", state: "pending" },
    ],
    services: [],
    cart: {
      // Spec v12 §Step 4 "Empty cart — auto-populated defaults":
      // every new visit starts with Vitals + Teleconsult at $0 to nudge
      // the nurse to record vitals and book a tele slot. Both are removable.
      items: [
        { id: "vit-pkg", kind: "vitals", name: "Vital signs package", price: 0, qty: 1, payer: "direct", status: "pending", auto: true },
        { id: "telecon", kind: "telecon", name: "Teleconsultation", price: 0, qty: 1, payer: "direct", status: "pending", auto: true },
      ],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    },
    visitDetails: {
      chiefComplaint: "",
      medicalHistory: "",
      medications: "",
      allergies: "",
      notes: "Walk-in created from booking desk; ID not captured yet.",
    },
    labTests: [],
    insurance: [],
    priorResults: [
      { id: "pr-ak1", testId: "covid", testName: "COVID-19 PCR", visitDate: "2025-06-18", status: "complete", price: 18, sensitive: false },
    ],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 0,
    handoffStates: ["in-progress","pending","pending","pending"],
    identity: { verified: false },
    arrivedRaw: "Today, 09:47 AM",
    manualEntry: true,
  },
];

const catalogById = new Map(STANDARD_ORDER_CATALOG.map(item => [item.id, item]));
const pad = (n, width = 3) => String(n).padStart(width, "0");
const initialsFor = (name) => name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
const dobForAge = (age, index) => {
  const year = 2026 - age;
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String((index % 27) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const ageFromDob = (dob) => 2026 - Number(dob.slice(0, 4));
const itemFromCatalog = (id, payer = "direct", overrides = {}) => {
  const c = catalogById.get(id) || {};
  return {
    id,
    kind: overrides.kind || c.kind || "lab",
    name: overrides.name || c.name || id,
    price: overrides.price ?? c.price ?? 0,
    qty: 1,
    payer,
    status: overrides.status || "pending",
    ...overrides,
  };
};
const defaultZeroItems = (payer = "direct") => [
  { id: "vit-pkg", kind: "vitals", name: "Vital signs package", price: 0, qty: 1, payer, status: "pending", auto: true },
  { id: "telecon", kind: "telecon", name: "Teleconsultation", price: 0, qty: 1, payer, status: "pending", auto: true },
];
const cartFor = (items, payment = { method: null, status: "idle", tendered: "" }, ccy = "USD", extras = {}) => ({
  items,
  promos: extras.promos || {},
  splits: extras.splits || null,
  ccy,
  payment,
  pregnancyConsent: extras.pregnancyConsent || null,
});
const labTestsFrom = (items) => items
  .filter(item => item.kind === "lab")
  .map(item => ({ id: item.id, name: item.name, price: item.price, status: item.status === "paid" ? "ordered" : item.status }));
const servicesFrom = (items, payerLabel = "Direct Pay") => items
  .filter(item => item.kind !== "telecon" && item.id !== "telecon")
  .map(item => ({ name: item.name, payer: payerLabel, status: item.status || "pending", amount: item.price || 0 }));

const mockFirstNames = [
  "Kosal", "Sophea", "Lina", "Rithy", "Maly", "Dalin", "Sovann", "Bopha", "Vichet", "Sreyneang",
  "Minh", "Lan", "Huy", "Thao", "Quang", "Anh", "Niran", "Pim", "Somchai", "Araya",
  "Jisoo", "Minho", "Elena", "Marco", "Amina", "Omar", "Hannah", "Lucas", "Noor", "Yara",
];
const mockLastNames = [
  "Sok", "Chan", "Kim", "Chea", "Lim", "Heng", "Ly", "Phan", "Nguyen", "Tran",
  "Pham", "Le", "Sato", "Tan", "Wong", "Singh", "Khan", "Martin", "Dubois", "Garcia",
  "Park", "Lee", "Rahman", "Chen", "Patel",
];
const mockReasons = [
  ["Annual physical"],
  ["Diabetes follow-up", "HbA1c"],
  ["Chest discomfort", "ECG"],
  ["Fatigue", "Iron studies"],
  ["Pregnancy check", "Ultrasound"],
  ["Travel clearance", "COVID PCR"],
  ["Back pain", "Imaging"],
  ["Hypertension follow-up"],
  ["Fever", "CBC"],
  ["Thyroid review"],
  ["Corporate screening"],
  ["Insurance billing"],
  ["Booking code follow-up"],
  ["Vaccination clearance"],
  ["Kidney monitoring"],
  ["Pediatric fever"],
];
const languages = ["Khmer", "English", "Vietnamese", "Thai", "French", "Korean"];
const avatarColors = ["av-blue", "av-teal", "av-purple", "av-amber", "av-pink", "av-green"];
const countryProfiles = [
  { code: "+855", base: "12" },
  { code: "+855", base: "77" },
  { code: "+84", base: "933" },
  { code: "+66", base: "81" },
  { code: "+82", base: "10" },
  { code: "+33", base: "6" },
];
const insuranceProviders = ["Forte Insurance", "Prudential", "AIA Cambodia", "Manulife", "NSSF (National Social Security Fund)", "Bupa Global"];
const corporateAccounts = ["Angkor Foods", "Mekong Bank", "Phnom Penh Logistics", "Bayon Telecom", "Lotus Hospitality"];
const bookedSlots = [
  { id: "today_pm", hint: "Today - 14:00-14:30" },
  { id: "today_late", hint: "Today - 16:30-17:00" },
  { id: "tom_am", hint: "Tomorrow - 09:00-09:30" },
  { id: "tom_pm", hint: "Tomorrow - 15:00-15:30" },
];

function paymentAmount(items) {
  return items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
}

function buildGeneratedPatient(index) {
  const n = index + 1;
  const scenario = index % 20;
  const duplicateRisk = index === 15;
  const sexAtBirth = index % 3 === 0 ? "Female" : "Male";
  const first = mockFirstNames[index % mockFirstNames.length];
  const last = mockLastNames[(index * 7) % mockLastNames.length];
  const name = duplicateRisk ? "Maya Tran" : `${first} ${last}`;
  const age = duplicateRisk ? 30 : 18 + ((index * 7) % 58);
  const dob = duplicateRisk ? "1996-02-14" : dobForAge(age, index);
  const country = duplicateRisk ? { code: "+855", base: "12" } : countryProfiles[index % countryProfiles.length];
  const localPhone = duplicateRisk
    ? "12 345 678"
    : `${country.base} ${pad(200 + ((index * 37) % 700), 3)} ${pad(100 + ((index * 53) % 800), 3)}`;
  const mobile = `${country.code} ${localPhone}`;
  const id = `p-mock-${pad(n)}`;
  const queueNumber = `Q-${pad(51 + index)}`;
  const arrivedMinute = 50 + index;
  const arrivedHour = 9 + Math.floor(arrivedMinute / 60);
  const arrivedMins = arrivedMinute % 60;
  const arrivedAt = `${String(arrivedHour).padStart(2, "0")}:${String(arrivedMins).padStart(2, "0")} AM`;
  const base = {
    id,
    name,
    gender: sexAtBirth,
    sexAtBirth,
    age: ageFromDob(dob),
    initials: initialsFor(name),
    avatarColor: avatarColors[index % avatarColors.length],
    arrivedAt,
    queueNumber,
    status: { tone: "info", label: "Awaiting check-in" },
    visitReason: mockReasons[index % mockReasons.length],
    language: languages[index % languages.length],
    countryCode: country.code,
    phoneNumber: localPhone,
    mobile,
    dob,
    telegramHandle: index % 4 === 0 ? `t.me/${first.toLowerCase()}${last.toLowerCase()}${pad(n, 2)}` : "",
    telegramVerified: index % 4 === 0,
    commMethod: index % 4 === 0 ? "telegram" : "sms",
    otpVerified: true,
    pwaSentAt: arrivedAt,
    idScanned: true,
    idNumber: `MOCK${pad(260500 + n, 6)}`,
    payer: "direct",
    insuranceAcked: true,
    documents: { id: "ok", consent: "ok", insurance: "pending", receipt: "pending" },
    pwaProgress: 100,
    pwaLog: [
      { type: "sent", text: index % 4 === 0 ? "Link sent by Telegram" : "Link sent by SMS", time: arrivedAt, state: "ok" },
      { type: "verified", text: index % 4 === 0 ? "Telegram verified" : "OTP verified", time: arrivedAt, state: "ok" },
    ],
    services: [],
    cart: cartFor(defaultZeroItems()),
    visitDetails: {
      chiefComplaint: mockReasons[index % mockReasons.length].join(", "),
      medicalHistory: index % 5 === 0 ? "Hypertension" : index % 7 === 0 ? "Type 2 diabetes" : "",
      medications: index % 5 === 0 ? "Amlodipine 5mg daily" : index % 7 === 0 ? "Metformin 500mg twice daily" : "",
      allergies: index % 11 === 0 ? "Penicillin" : index % 13 === 0 ? "Shellfish" : "None known",
      notes: "",
    },
    visitDetailsAuthors: {
      chiefComplaint: "patient",
      allergies: "patient",
    },
    labTests: [],
    insurance: [],
    priorResults: index % 3 === 0 ? [
      { id: `pr-${id}-cbc`, testId: "cbc", testName: "Complete Blood Count (CBC)", visitDate: "2026-02-10", status: "complete", price: 8, sensitive: false },
      { id: `pr-${id}-lipid`, testId: "lipid", testName: "Lipid Panel", visitDate: "2025-11-18", status: "complete", price: 12, sensitive: true },
    ] : [],
    teleconsult: { status: "notBooked", slot: null, by: null },
    handoff: 1,
    handoffStates: ["done", "done", "pending", "pending"],
    identity: { verified: true, source: "scan", lockedFields: ["name", "dob", "sexAtBirth"] },
    manualEntry: false,
    arrivedRaw: `Today, ${arrivedAt}`,
  };

  let items = [];
  let payment = { method: null, status: "idle", tendered: "" };
  let payerLabel = "Direct Pay";
  switch (scenario) {
    case 0:
      items = [itemFromCatalog("visit-gp"), itemFromCatalog("cbc"), itemFromCatalog("glucose"), itemFromCatalog("lipid")];
      base.status = { tone: "info", label: "Ready to pay" };
      base.teleconsult = { status: "waived", skipped: true, slot: null, by: "nurse" };
      break;
    case 1:
      items = [itemFromCatalog("hba1c"), itemFromCatalog("kft"), itemFromCatalog("urinalysis")];
      base.status = { tone: "warn", label: "Needs insurance" };
      base.payer = "insurance";
      base.insuranceAcked = false;
      base.documents = { ...base.documents, insurance: "pending" };
      base.insurance = [{ id: `ins-${id}`, provider: insuranceProviders[index % insuranceProviders.length], policyNumber: `POL-${pad(700000 + index, 6)}`, memberName: name, memberId: `M-${pad(9000 + index, 5)}`, expiry: "12/2027", coverage: "Outpatient", cardAttached: false }];
      break;
    case 2:
      items = [itemFromCatalog("xray-chest", "direct", { validationState: "sent" }), itemFromCatalog("cbc")];
      base.status = { tone: "danger", label: "Consent required" };
      base.documents = { ...base.documents, consent: "pending" };
      base.exception = "consent";
      base.handoffStates = ["done", "done", "done", "blocked"];
      break;
    case 3:
      items = [itemFromCatalog("covid"), itemFromCatalog("vit-b12")];
      payment = { method: "cash", status: "confirmed", receiptId: `KUR-260502-${pad(300 + index)}`, confirmedAt: "2026-05-02T03:10:00Z", amount: paymentAmount(items), currency: "USD", tendered: String(paymentAmount(items) + 2), change: 2, cashier: "Linh Nguyen" };
      base.status = { tone: "success", label: "Checked in" };
      base.checkedInAt = "2026-05-02T03:12:00Z";
      base.documents = { ...base.documents, receipt: "ok" };
      base.handoff = 3;
      base.handoffStates = ["done", "done", "done", "done"];
      break;
    case 4:
      items = [itemFromCatalog("kft"), itemFromCatalog("urinalysis")];
      payment = { method: "khqr", status: "waiting", tendered: "" };
      base.status = { tone: "info", label: "Payment pending" };
      base.pwaLog.push({ type: "pending", text: "KHQR waiting", time: arrivedAt, state: "pending" });
      break;
    case 5:
      items = [{ id: "vit-pkg", kind: "vitals", name: "Vital signs package", price: 0, qty: 1, payer: "direct", status: "pending", auto: true }];
      base.status = { tone: "success", label: "No charge" };
      base.teleconsult = { status: "waived", skipped: true, slot: null, by: "nurse" };
      break;
    case 6:
      items = [itemFromCatalog("visit-gp", "corporate"), itemFromCatalog("ecg-12", "corporate"), itemFromCatalog("lipid", "corporate")];
      base.payer = "corporate";
      payerLabel = "Corporate";
      base.status = { tone: "success", label: "Corporate ready" };
      base.corporateAccount = corporateAccounts[index % corporateAccounts.length];
      break;
    case 7:
      items = [itemFromCatalog("tsh"), itemFromCatalog("ferritin")];
      payment = { method: null, status: "deferred", tendered: "" };
      base.status = { tone: "info", label: "Pay later" };
      break;
    case 8:
      items = [itemFromCatalog("cbc"), itemFromCatalog("ferritin")];
      base.status = { tone: "warn", label: "Verify contact" };
      base.otpVerified = false;
      base.telegramVerified = false;
      base.pwaProgress = 35;
      base.pwaLog = [{ type: "sent", text: "Link sent by SMS", time: arrivedAt, state: "ok" }, { type: "pending", text: "OTP not verified", time: "Awaiting patient", state: "pending" }];
      break;
    case 9:
      items = defaultZeroItems();
      base.status = { tone: "info", label: "Awaiting ID" };
      base.idScanned = false;
      base.manualEntry = true;
      base.identity = { verified: false, source: "manual", lockedFields: [] };
      base.documents = { id: "pending", consent: "pending", insurance: "pending", receipt: "pending" };
      base.pwaProgress = 0;
      base.pwaLog = [{ type: "pending", text: "Waiting for National ID scan", time: "Now", state: "pending" }];
      break;
    case 10:
      items = [itemFromCatalog("preg"), itemFromCatalog("us-preg", "direct", { validationState: "idle" })];
      base.status = { tone: "danger", label: "Pregnancy consent" };
      base.documents = { ...base.documents, consent: "pending" };
      base.cart = cartFor(items, payment, "USD", { pregnancyConsent: { state: "pending" } });
      break;
    case 11:
      items = [itemFromCatalog("cbc"), itemFromCatalog("glucose"), itemFromCatalog("kft"), itemFromCatalog("lipid")];
      base.status = { tone: "success", label: "Booking applied" };
      base.consumedBookingCodes = ["BC-2026042-DIA3"];
      break;
    case 12:
      items = [itemFromCatalog("xray-knee", "direct", { validationState: "verbal", verbalBy: "Linh Nguyen" }), itemFromCatalog("esr")];
      base.status = { tone: "info", label: "Verbal consent" };
      break;
    case 13:
      items = [itemFromCatalog("visit-gp"), itemFromCatalog("hba1c"), itemFromCatalog("lipid")];
      base.status = { tone: "info", label: "Teleconsult booked" };
      base.teleconsult = { status: "booked", booked: true, slot: bookedSlots[index % bookedSlots.length], by: "nurse", bookedAt: "2026-05-02T04:00:00Z" };
      break;
    case 14:
      items = [itemFromCatalog("visit-spec"), itemFromCatalog("ct-head", "insurance")];
      base.status = { tone: "warn", label: "Pre-auth needed" };
      base.payer = "insurance";
      payerLabel = "Insurance";
      base.insurance = [{ id: `ins-${id}`, provider: insuranceProviders[index % insuranceProviders.length], policyNumber: `PRE-${pad(800000 + index, 6)}`, memberName: name, memberId: `M-${pad(12000 + index, 5)}`, expiry: "08/2027", coverage: "Pre-auth required", cardAttached: true }];
      break;
    case 15:
      items = [itemFromCatalog("cbc"), itemFromCatalog("glucose")];
      base.status = { tone: "danger", label: "Possible duplicate" };
      base.notes = "Duplicate-risk seed: same name/DOB/phone suffix as Maya Tran.";
      break;
    case 16:
      items = [itemFromCatalog("visit-gp"), itemFromCatalog("lft"), itemFromCatalog("ptinr")];
      payment = { method: "split", status: "split-cash", cashPortion: "10", cashConfirmed: true, tendered: "10" };
      base.status = { tone: "info", label: "Split payment" };
      break;
    case 17:
      items = [itemFromCatalog("stool"), itemFromCatalog("electro")];
      base.status = { tone: "warn", label: "Intake incomplete" };
      base.pwaProgress = 58;
      base.pwaLog.push({ type: "pending", text: "Medical history pending", time: "58% complete", state: "pending" });
      base.visitDetails.medicalHistory = "";
      base.visitDetails.medications = "";
      break;
    case 18:
      items = [itemFromCatalog("visit-gp", "referral"), itemFromCatalog("echo", "referral")];
      base.payer = "referral";
      payerLabel = "Referral";
      base.status = { tone: "info", label: "Referral review" };
      base.referralClinic = "Kampot Clinic";
      break;
    default:
      items = [itemFromCatalog("vit-d"), itemFromCatalog("vit-b12"), itemFromCatalog("cbc")];
      base.status = { tone: "success", label: "Ready for nurse" };
      break;
  }

  if (!base.cart || base.cart.items.length === 0 || scenario !== 10) {
    base.cart = cartFor(items, payment, scenario % 9 === 0 ? "KHR" : "USD");
  }
  base.services = servicesFrom(base.cart.items, payerLabel);
  base.labTests = labTestsFrom(base.cart.items);
  if (!base.teleconsult.booked && !base.teleconsult.skipped && !base.cart.items.some(item => item.kind === "telecon" || item.id === "telecon")) {
    base.teleconsult = { status: "waived", skipped: true, slot: null, by: "nurse" };
  }
  if (base.status.label === "Checked in") {
    base.pwaLog.push({ type: "ok", text: "Check-in complete", time: arrivedAt, state: "ok" });
  }
  return base;
}

const generatedPatients = Array.from({ length: 100 }, (_, index) => buildGeneratedPatient(index));

export const initialPatients = [...seedPatients, ...generatedPatients];

export const queueCounts = { Waiting: 72, "Intake Sent": 21, Ready: 17, Exceptions: 14 };

export const initialNotifications = [
  {
    id: "n1",
    tone: "danger",
    icon: "AlertTriangle",
    titleKey: "notif.consentDeclined",
    bodyKey: "notif.consentDeclined.body",
    bodyParams: { name: "An Le" },
    time: "2m ago",
    timeKey: "time.minutesAgo",
    timeParams: { n: 2 },
    read: false,
    patientId: "p4",
    actionKey: "notif.action.review",
  },
  {
    id: "n2",
    tone: "warn",
    icon: "Shield",
    titleKey: "notif.insurancePending",
    bodyKey: "notif.insurancePending.body",
    bodyParams: { name: "Bao Nguyen" },
    time: "8m ago",
    timeKey: "time.minutesAgo",
    timeParams: { n: 8 },
    read: false,
    patientId: "p2",
    actionKey: "notif.action.verify",
  },
  {
    id: "n3",
    tone: "info",
    icon: "Smartphone",
    titleKey: "notif.pwaCompleted",
    bodyKey: "notif.pwaCompleted.body",
    bodyParams: { name: "Pierre Tison" },
    time: "12m ago",
    timeKey: "time.minutesAgo",
    timeParams: { n: 12 },
    read: false,
    patientId: "p3",
    actionKey: "notif.action.open",
  },
  {
    id: "n4",
    tone: "success",
    icon: "Flask",
    titleKey: "notif.labReady",
    bodyKey: "notif.labReady.body",
    bodyParams: { name: "Sokha Pich" },
    time: "23m ago",
    timeKey: "time.minutesAgo",
    timeParams: { n: 23 },
    read: true,
    actionKey: "notif.action.view",
  },
  {
    id: "n5",
    tone: "info",
    icon: "Calendar",
    titleKey: "notif.appointmentReminder",
    bodyKey: "notif.appointmentReminder.body",
    bodyParams: { count: 5 },
    time: "1h ago",
    timeKey: "time.hoursAgo",
    timeParams: { n: 1 },
    read: true,
    actionKey: "notif.action.viewSchedule",
  },
  {
    id: "n6",
    tone: "info",
    icon: "Settings",
    titleKey: "notif.systemUpdate",
    bodyKey: "notif.systemUpdate.body",
    time: "2h ago",
    timeKey: "time.hoursAgo",
    timeParams: { n: 2 },
    read: true,
    actionKey: "notif.action.learnMore",
  },
];

export const stations = [
  { id: "PSC-01", labelKey: "station.psc01", caption: "Main reception" },
  { id: "PSC-02", labelKey: "station.psc02", caption: "Triage desk" },
  { id: "PSC-03", labelKey: "station.psc03", caption: "Express counter" },
];

export const shifts = [
  { id: "morning", labelKey: "topbar.shiftMorning", time: "07:00 — 13:00" },
  { id: "afternoon", labelKey: "shift.afternoon", time: "13:00 — 19:00" },
  { id: "night", labelKey: "shift.night", time: "19:00 — 23:00" },
];

export const payerOptions = [
  { id: "direct",    name: "Direct Pay", icon: "CreditCard", caption: "Patient pays at counter" },
  { id: "insurance", name: "Insurance",  icon: "Shield",      caption: "Verify insurance card" },
  { id: "corporate", name: "Corporate",  icon: "Building",    caption: "Bill to employer" },
  { id: "referral",  name: "Referral",   icon: "Network",     caption: "Linked to referring clinic" },
];

export const LAB_CATALOG = STANDARD_LAB_CATALOG;

export const LAB_CATEGORIES = STANDARD_LAB_CATEGORIES;

export const INSURANCE_PROVIDERS = [
  "Forte Insurance",
  "Prudential",
  "AIA Cambodia",
  "Manulife",
  "Cambodia Life Insurance",
  "Sovannaphum Life",
  "Asia Insurance",
  "Infinity General Insurance",
  "NSSF (National Social Security Fund)",
  "Bupa Global",
  "Pacific Cross",
];

export const VISIT_FEE = 15;
export const KHR_RATE = 4100;
