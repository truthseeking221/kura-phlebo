// === Standardized order catalogue seed data ===
// LOINC-style naming: component + specimen/system + method where it matters.
// Production should map each row to the local LIS code and exact LOINC code.

const LAB_CATEGORY_PRICE = {
  Biochemistry: 8,
  Urinalysis: 6,
  Endocrinology: 16,
  Haematology: 8,
  Coagulation: 10,
  Microbiology: 18,
  Immunology: 16,
  Toxicology: 22,
  "Therapeutic Drugs": 24,
  Molecular: 55,
  Allergy: 20,
  "Blood Gas": 14,
};

export const CORE_ORDER_CATALOG = [
  { id: "visit-gp",     kind: "visit",   name: "GP consultation (visit fee)",  price: 15, popular: true },
  { id: "visit-spec",   kind: "visit",   name: "Specialist consultation",      price: 35 },
  { id: "cbc",          kind: "lab",     name: "Complete Blood Count (CBC)",   price: 8,  category: "Haematology", popular: true },
  { id: "glucose",      kind: "lab",     name: "Blood Glucose (Fasting)",      price: 5,  category: "Biochemistry", popular: true, fasting: true },
  { id: "lipid",        kind: "lab",     name: "Lipid Panel",                  price: 12, category: "Biochemistry", popular: true, fasting: true, alcohol: true },
  { id: "tsh",          kind: "lab",     name: "TSH (Thyroid)",                price: 14, category: "Endocrinology", popular: true },
  { id: "hba1c",        kind: "lab",     name: "HbA1c (Diabetes)",             price: 11, category: "Biochemistry", drugs: true },
  { id: "urinalysis",   kind: "lab",     name: "Urinalysis",                   price: 6,  category: "Urinalysis", popular: true },
  { id: "preg",         kind: "lab",     name: "Pregnancy (β-hCG)",            price: 7,  category: "Endocrinology", popular: true },
  { id: "lft",          kind: "lab",     name: "Liver Function (LFT)",         price: 13, category: "Biochemistry", alcohol: true, drugs: true },
  { id: "kft",          kind: "lab",     name: "Kidney Function (KFT)",        price: 13, category: "Biochemistry", drugs: true },
  { id: "electro",      kind: "lab",     name: "Electrolytes Panel",           price: 9,  category: "Biochemistry" },
  { id: "esr",          kind: "lab",     name: "ESR (Sed Rate)",               price: 5,  category: "Haematology" },
  { id: "ferritin",     kind: "lab",     name: "Ferritin",                     price: 9,  category: "Biochemistry" },
  { id: "ptinr",        kind: "lab",     name: "PT / INR",                     price: 8,  category: "Coagulation" },
  { id: "hbsag",        kind: "lab",     name: "Hepatitis B Surface Antigen (HBsAg)", price: 9, category: "Immunology", unavailable: true, unavailableReason: "Reagents restocking", availableBack: "7 May" },
  { id: "covid",        kind: "lab",     name: "COVID-19 PCR",                 price: 18, category: "Microbiology", vaccine: true },
  { id: "stool",        kind: "lab",     name: "Stool Culture",                price: 11, category: "Microbiology" },
  { id: "vit-d",        kind: "lab",     name: "Vitamin D",                    price: 25, category: "Biochemistry", fasting: true },
  { id: "vit-b12",      kind: "lab",     name: "Vitamin B12",                  price: 18, category: "Biochemistry" },
  { id: "xray-chest",   kind: "imaging", name: "X-ray — Chest",                price: 15, popular: true },
  { id: "xray-lumbar",  kind: "imaging", name: "X-ray — Lumbar spine",         price: 18 },
  { id: "xray-knee",    kind: "imaging", name: "X-ray — Knee",                 price: 16 },
  { id: "us-abd",       kind: "imaging", name: "Ultrasound — Abdomen",         price: 35 },
  { id: "us-thyroid",   kind: "imaging", name: "Ultrasound — Thyroid",         price: 30 },
  { id: "us-preg",      kind: "imaging", name: "Ultrasound — OB / Pregnancy",  price: 40 },
  { id: "ct-head",      kind: "imaging", name: "CT scan — Head",               price: 90 },
  { id: "mri-knee",     kind: "imaging", name: "MRI — Knee",                   price: 180 },
  { id: "ecg-12",       kind: "ecg",     name: "ECG — 12 lead",                price: 22, popular: true },
  { id: "ecg-stress",   kind: "ecg",     name: "Stress test (Treadmill ECG)",  price: 65 },
  { id: "ecg-holter",   kind: "ecg",     name: "Holter monitor (24h)",         price: 75 },
  { id: "echo",         kind: "ecg",     name: "Echocardiogram",               price: 60 },
  { id: "vit-bp",       kind: "vitals",  name: "Blood pressure",               price: 0,  popular: true },
  { id: "vit-bmi",      kind: "vitals",  name: "Height / weight / BMI",        price: 0 },
  { id: "vit-spo2",     kind: "vitals",  name: "SpO₂ (oxygen saturation)",     price: 0 },
  { id: "vit-temp",     kind: "vitals",  name: "Temperature",                  price: 0 },
  { id: "vit-vision",   kind: "vitals",  name: "Vision test (Snellen)",        price: 3 },
  { id: "vit-audio",    kind: "vitals",  name: "Hearing screen",               price: 5 },
  { id: "tele-gp",      kind: "telecon", name: "Telecon — GP follow-up (15m)", price: 12 },
  { id: "tele-spec",    kind: "telecon", name: "Telecon — Specialist (30m)",   price: 30 },
  { id: "tele-mh",      kind: "telecon", name: "Telecon — Mental health (45m)",price: 35 },
];

const CHEMISTRY_ANALYTES = [
  "Albumin", "Alkaline phosphatase", "ALT", "Ammonia", "Amylase", "AST", "Bicarbonate",
  "Bilirubin direct", "Bilirubin total", "Calcium", "Calcium ionized", "Chloride", "CK-MB",
  "Creatine kinase", "Creatinine", "C-reactive protein", "Cystatin C", "Gamma GT",
  "Globulin", "Glucose random", "HDL cholesterol", "LDL cholesterol", "Lactate",
  "LDH", "Lipase", "Magnesium", "Osmolality", "Phosphate", "Potassium", "Prealbumin",
  "Procalcitonin", "Sodium", "Total cholesterol", "Total protein", "Transferrin",
  "Triglycerides", "Troponin I", "Troponin T", "Urea nitrogen", "Uric acid", "Zinc",
  "Copper", "Ceruloplasmin", "Homocysteine", "Apolipoprotein A1", "Apolipoprotein B",
  "Lipoprotein(a)", "High-sensitivity CRP", "Beta-2 microglobulin", "Free fatty acids",
  "Ketones", "Beta-hydroxybutyrate", "Angiotensin converting enzyme", "Aldolase",
  "Myoglobin", "NT-proBNP", "BNP", "Fructosamine", "Galactose", "Lactate dehydrogenase isoenzymes",
  "Iron", "Total iron binding capacity", "Unsaturated iron binding capacity", "Transferrin saturation",
  "Folate", "Methylmalonic acid", "Vitamin A", "Vitamin E", "Vitamin K", "Vitamin C",
  "Selenium", "Chromium", "Manganese", "Lead", "Mercury", "Arsenic", "Cadmium",
  "Carboxyhemoglobin", "Methemoglobin", "Cholinesterase", "Pseudocholinesterase",
];

const URINE_ANALYTES = [
  "Albumin", "Albumin/creatinine ratio", "Amylase", "Bence Jones protein", "Calcium",
  "Catecholamines", "Chloride", "Cortisol free", "Creatinine", "Drug screen",
  "Electrolytes panel", "Glucose", "hCG qualitative", "Ketones", "Magnesium",
  "Microalbumin", "Osmolality", "Oxalate", "Phosphate", "Porphyrins", "Potassium",
  "Protein", "Protein/creatinine ratio", "Sodium", "Urea nitrogen", "Uric acid",
  "Vanillylmandelic acid", "5-HIAA", "24-hour protein", "Citrate", "Cystine",
  "Myoglobin", "Hemoglobin", "N-telopeptide", "Metanephrines", "Nicotine metabolites",
];

const BLOOD_GAS_ANALYTES = [
  "pH", "pCO2", "pO2", "Bicarbonate", "Base excess", "Oxygen saturation",
  "Lactate", "Ionized calcium", "Potassium", "Sodium", "Chloride", "Glucose",
  "Hemoglobin", "Carboxyhemoglobin", "Methemoglobin", "Anion gap",
];

const ENDOCRINE_TESTS = [
  "ACTH", "Aldosterone", "Androstenedione", "Anti-Mullerian hormone", "Calcitonin",
  "Cortisol AM", "Cortisol PM", "C-peptide", "DHEA sulfate", "Estradiol",
  "Estriol unconjugated", "FSH", "Free T3", "Free T4", "Gastrin", "Growth hormone",
  "IGF-1", "Insulin", "LH", "Parathyroid hormone", "Progesterone", "Prolactin",
  "Renin activity", "Reverse T3", "Sex hormone binding globulin", "Testosterone free",
  "Testosterone total", "Thyroglobulin", "Thyroid peroxidase antibody", "TSH receptor antibody",
  "17-hydroxyprogesterone", "Beta-hCG quantitative", "PTH-related peptide", "Somatomedin C",
  "Insulin-like growth factor binding protein 3", "Dihydrotestosterone", "Inhibin A", "Inhibin B",
  "Placental growth factor", "Human placental lactogen", "Pregnenolone", "Adrenal antibody",
  "Glucagon", "Pancreatic polypeptide", "Vasoactive intestinal peptide", "Chromogranin A",
];

const HEMATOLOGY_TESTS = [
  "Absolute basophil count", "Absolute eosinophil count", "Absolute lymphocyte count",
  "Absolute monocyte count", "Absolute neutrophil count", "Band neutrophils", "Blood smear review",
  "Bone marrow differential", "Eosinophil count", "Erythropoietin", "Fetal hemoglobin",
  "G6PD screen", "Haptoglobin", "Hematocrit", "Hemoglobin", "Hemoglobin electrophoresis",
  "Immature granulocytes", "MCH", "MCHC", "MCV", "Metamyelocytes", "Nucleated RBC",
  "Platelet count", "Platelet estimate", "RBC count", "RDW", "Reticulocyte count",
  "Reticulocyte hemoglobin", "Sickle cell screen", "WBC count", "Malaria smear",
  "Osmotic fragility", "Heinz body prep", "Cold agglutinin titer", "Direct antiglobulin test",
  "Indirect antiglobulin test", "Leukocyte alkaline phosphatase", "Flow cytometry leukemia panel",
  "CD3 count", "CD4 count", "CD8 count", "CD19 count", "CD56 count", "HLA-B27",
];

const COAGULATION_TESTS = [
  "Activated clotting time", "Activated protein C resistance", "Antithrombin activity",
  "Antithrombin antigen", "APTT", "Bleeding time", "D-dimer", "Fibrin degradation products",
  "Fibrinogen activity", "Factor II activity", "Factor V activity", "Factor VII activity",
  "Factor VIII activity", "Factor IX activity", "Factor X activity", "Factor XI activity",
  "Factor XII activity", "Factor XIII activity", "Lupus anticoagulant", "Protein C activity",
  "Protein C antigen", "Protein S activity", "Protein S free antigen", "Protein S total antigen",
  "Prothrombin time", "Reptilase time", "Thrombin time", "Von Willebrand factor activity",
  "Von Willebrand factor antigen", "Anti-Xa unfractionated heparin", "Anti-Xa low molecular weight heparin",
  "Platelet function assay", "Mixing study APTT", "Mixing study PT", "INR",
];

const IMMUNOLOGY_TESTS = [
  "ANA screen", "ANA titer", "Anti-dsDNA antibody", "Anti-Sm antibody", "Anti-RNP antibody",
  "Anti-SSA antibody", "Anti-SSB antibody", "Anti-Scl-70 antibody", "Anti-centromere antibody",
  "Anti-Jo-1 antibody", "Anti-CCP antibody", "Rheumatoid factor", "Complement C3",
  "Complement C4", "Total complement CH50", "C1 esterase inhibitor", "Cardiolipin IgG antibody",
  "Cardiolipin IgM antibody", "Beta-2 glycoprotein I IgG", "Beta-2 glycoprotein I IgM",
  "MPO antibody", "PR3 antibody", "ANCA screen", "Anti-GBM antibody", "Tissue transglutaminase IgA",
  "Tissue transglutaminase IgG", "Endomysial antibody", "Gliadin deamidated IgA",
  "Gliadin deamidated IgG", "Intrinsic factor antibody", "Parietal cell antibody",
  "Mitochondrial antibody", "Smooth muscle antibody", "Liver kidney microsomal antibody",
  "Thyroglobulin antibody", "TPO antibody", "Immunoglobulin A", "Immunoglobulin E",
  "Immunoglobulin G", "Immunoglobulin M", "IgG subclass 1", "IgG subclass 2",
  "IgG subclass 3", "IgG subclass 4", "Serum protein electrophoresis", "Urine protein electrophoresis",
  "Immunofixation serum", "Immunofixation urine", "Kappa free light chain", "Lambda free light chain",
  "Kappa/lambda ratio", "Cryoglobulin screen", "HLA antibody screen", "Transplant crossmatch",
];

const PATHOGENS = [
  "Adenovirus", "BK virus", "Bordetella pertussis", "Campylobacter", "Candida auris",
  "Chikungunya virus", "Chlamydia pneumoniae", "Chlamydia trachomatis", "Clostridioides difficile",
  "Cytomegalovirus", "Dengue virus", "Ebola virus", "Epstein-Barr virus", "Enterovirus",
  "Escherichia coli O157", "Giardia lamblia", "Gonorrhoeae", "Haemophilus influenzae",
  "Helicobacter pylori", "Hepatitis A virus", "Hepatitis B virus", "Hepatitis C virus",
  "Herpes simplex virus 1", "Herpes simplex virus 2", "HIV-1", "HIV-2", "Human metapneumovirus",
  "Human papillomavirus", "Influenza A", "Influenza B", "Legionella pneumophila",
  "Leishmania", "Leptospira", "Malaria parasite", "Measles virus", "Monkeypox virus",
  "Mycobacterium tuberculosis", "Mycoplasma pneumoniae", "Norovirus", "Parainfluenza virus",
  "Parvovirus B19", "Respiratory syncytial virus", "Rickettsia", "Rotavirus", "Rubella virus",
  "Salmonella", "SARS-CoV-2", "Shigella", "Streptococcus group A", "Streptococcus pneumoniae",
  "Strongyloides", "Syphilis treponemal", "Toxoplasma gondii", "Trichomonas vaginalis",
  "Varicella zoster virus", "West Nile virus", "Zika virus",
];

const CULTURE_ORDERS = [
  "Blood culture aerobic", "Blood culture anaerobic", "Urine culture", "Sputum culture",
  "Throat culture", "Wound culture", "Stool culture", "Cerebrospinal fluid culture",
  "Genital culture", "Eye culture", "Ear culture", "Nasal culture", "MRSA screen culture",
  "Fungal culture", "AFB culture", "Mycology culture", "Anaerobic culture", "Catheter tip culture",
  "Body fluid culture", "Tissue culture", "Bone culture", "Synovial fluid culture",
];

const TOXICOLOGY_DRUGS = [
  "Acetaminophen", "Amphetamine", "Barbiturates", "Benzodiazepines", "Buprenorphine",
  "Cannabinoids", "Carbamazepine", "Carisoprodol", "Cocaine metabolite", "Ethanol",
  "Ethylene glycol", "Fentanyl", "Gabapentin", "Gamma-hydroxybutyrate", "Ketamine",
  "Lamotrigine", "Lithium", "Meprobamate", "Methadone", "Methamphetamine",
  "Methanol", "Methaqualone", "Opiates", "Oxycodone", "Phencyclidine", "Phenobarbital",
  "Phenytoin", "Pregabalin", "Propoxyphene", "Salicylate", "Topiramate", "Tramadol",
  "Tricyclic antidepressants", "Valproic acid", "Zolpidem",
];

const THERAPEUTIC_DRUGS = [
  "Amikacin", "Cyclosporine", "Digoxin", "Everolimus", "Gentamicin peak",
  "Gentamicin trough", "Levetiracetam", "Mycophenolic acid", "Phenobarbital",
  "Phenytoin free", "Phenytoin total", "Primidone", "Sirolimus", "Tacrolimus",
  "Theophylline", "Tobramycin peak", "Tobramycin trough", "Valproate free",
  "Valproate total", "Vancomycin peak", "Vancomycin random", "Vancomycin trough",
  "Voriconazole", "Posaconazole", "Itraconazole", "Clozapine", "Norclozapine",
  "Methotrexate", "Quinidine", "Procainamide", "N-acetylprocainamide",
];

const GENES = [
  "ALK", "APC", "ATM", "BCR-ABL1", "BRAF", "BRCA1", "BRCA2", "CALR", "CEBPA",
  "CFTR", "CHEK2", "EGFR", "ERBB2", "ETV6", "Factor II F2", "Factor V Leiden",
  "FLT3", "G6PD", "HFE", "HLA-B*57:01", "IDH1", "IDH2", "JAK2", "KRAS", "MET",
  "MLH1", "MPL", "MSH2", "MSH6", "NPM1", "NRAS", "PML-RARA", "PMS2", "RET",
  "ROS1", "SMN1", "SMN2", "TP53", "UGT1A1", "Warfarin CYP2C9/VKORC1",
];

const ALLERGENS = [
  "Almond", "Alternaria alternata", "Apple", "Aspergillus fumigatus", "Banana",
  "Bermuda grass", "Birch pollen", "Cat dander", "Cashew nut", "Cladosporium",
  "Cockroach", "Codfish", "Cow milk", "Crab", "Dermatophagoides farinae",
  "Dermatophagoides pteronyssinus", "Dog dander", "Egg white", "Egg yolk",
  "Hazelnut", "House dust", "Latex", "Mango", "Mold mix", "Mouse urine protein",
  "Oak pollen", "Peanut", "Penicillium notatum", "Pineapple", "Pistachio",
  "Ragweed", "Rice", "Sesame seed", "Shrimp", "Soybean", "Timothy grass",
  "Walnut", "Wheat", "Yeast", "Peach", "Orange", "Tomato", "Strawberry",
  "Bee venom", "Wasp venom", "Mosquito", "Chicken meat", "Beef", "Pork",
];

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function priced(category, index, override) {
  if (override != null) return override;
  const base = LAB_CATEGORY_PRICE[category] ?? 12;
  return base + (index % 5) * 2;
}

function makeLabItem(prefix, category, name, index, options = {}) {
  return {
    id: `lab-${prefix}-${slugify(name)}`,
    kind: "lab",
    name,
    category,
    price: priced(category, index, options.price),
    standard: "LOINC-style",
    ...(options.extra || {}),
  };
}

function makeSpecimenSeries(prefix, category, analytes, specimens, options = {}) {
  return analytes.flatMap((analyte, analyteIndex) =>
    specimens.map((specimen, specimenIndex) => {
      const name = `${analyte} - ${specimen}`;
      const index = analyteIndex * specimens.length + specimenIndex;
      return makeLabItem(prefix, category, name, index, options);
    })
  );
}

function makeNamedSeries(prefix, category, names, options = {}) {
  return names.map((name, index) => makeLabItem(prefix, category, name, index, options));
}

function buildStandardLabExtensions() {
  return [
    ...makeSpecimenSeries("chem", "Biochemistry", CHEMISTRY_ANALYTES, ["Serum", "Plasma"]),
    ...makeSpecimenSeries("urine", "Urinalysis", URINE_ANALYTES, ["Urine"]),
    ...makeSpecimenSeries("gas", "Blood Gas", BLOOD_GAS_ANALYTES, ["Arterial blood", "Venous blood"]),
    ...makeSpecimenSeries("endo", "Endocrinology", ENDOCRINE_TESTS, ["Serum"]),
    ...makeSpecimenSeries("heme", "Haematology", HEMATOLOGY_TESTS, ["Blood"]),
    ...makeSpecimenSeries("coag", "Coagulation", COAGULATION_TESTS, ["Plasma"]),
    ...makeSpecimenSeries("infect-pcr", "Microbiology", PATHOGENS, ["PCR"]),
    ...makeSpecimenSeries("infect-ag", "Microbiology", PATHOGENS, ["Antigen"]),
    ...makeSpecimenSeries("infect-igg", "Immunology", PATHOGENS, ["IgG antibody"]),
    ...makeSpecimenSeries("infect-igm", "Immunology", PATHOGENS, ["IgM antibody"]),
    ...makeNamedSeries("culture", "Microbiology", CULTURE_ORDERS),
    ...makeSpecimenSeries("tox-ur", "Toxicology", TOXICOLOGY_DRUGS, ["Urine screen"]),
    ...makeSpecimenSeries("tox-serum", "Toxicology", TOXICOLOGY_DRUGS, ["Serum level"]),
    ...makeSpecimenSeries("tdm", "Therapeutic Drugs", THERAPEUTIC_DRUGS, ["Serum level"]),
    ...makeSpecimenSeries("gene", "Molecular", GENES, ["mutation analysis"]),
    ...makeSpecimenSeries("allergy", "Allergy", ALLERGENS, ["specific IgE"]),
  ];
}

function dedupeCatalog(items) {
  const seenIds = new Set();
  const seenNames = new Set();
  const out = [];
  for (const item of items) {
    const nameKey = item.kind === "lab" ? item.name.toLowerCase() : `${item.kind}:${item.name.toLowerCase()}`;
    if (seenIds.has(item.id) || seenNames.has(nameKey)) continue;
    seenIds.add(item.id);
    seenNames.add(nameKey);
    out.push(item);
  }
  return out;
}

export const ORDER_CATALOG = dedupeCatalog([
  ...CORE_ORDER_CATALOG,
  ...buildStandardLabExtensions(),
]);

export const LAB_CATEGORIES = [
  "Popular",
  "Biochemistry",
  "Endocrinology",
  "Haematology",
  "Coagulation",
  "Microbiology",
  "Immunology",
  "Urinalysis",
  "Blood Gas",
  "Toxicology",
  "Therapeutic Drugs",
  "Molecular",
  "Allergy",
];

export const LAB_CATALOG = ORDER_CATALOG
  .filter(item => item.kind === "lab")
  .map(({ id, name, category = "Biochemistry", popular, price }) => ({
    id,
    name,
    category,
    popular: !!popular,
    price,
  }));
