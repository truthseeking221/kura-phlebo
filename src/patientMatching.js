export function normalisePersonName(s) {
  return (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

export function phoneDigits(s) {
  return (s || "").toString().replace(/\D/g, "");
}

export function phonesMatch(a, b) {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (da.length < 8 || db.length < 8) return false;
  return da === db || da.endsWith(db) || db.endsWith(da);
}

function fullPhone(person = {}) {
  return `${person.countryCode || ""}${person.phoneNumber || person.mobile || ""}`;
}

function scoreCollision({ idMatch, phoneMatch, nameDobMatch, sexMatch, sexMismatch }) {
  let score = 0;
  if (idMatch) score += 100;
  if (nameDobMatch) score += 46;
  if (phoneMatch) score += 34;
  if (sexMatch) score += 8;
  if (sexMismatch) score -= 12;
  return score;
}

function collisionStrength({ idMatch, phoneMatch, nameDobMatch, sexMatch }) {
  if (idMatch) return "Exact ID match";
  if (phoneMatch && nameDobMatch && sexMatch) return "Exact identity match";
  if (phoneMatch && nameDobMatch) return "Strong identity match";
  if (nameDobMatch && sexMatch) return "Likely duplicate";
  return "Possible duplicate";
}

export function findPatientCollisionCandidates(draft, patients = []) {
  if (!draft) return [];

  const draftName = normalisePersonName(draft.name);
  const draftDob = draft.dob || "";
  const draftSex = draft.sexAtBirth || draft.gender || "";
  const draftIdNumber = (draft.idNumber || "").toString().trim();
  const draftPhone = fullPhone(draft);

  return patients
    .map((p, index) => {
      if (!p?.name || p.id === draft.id) return null;

      const idMatch = !!draftIdNumber && !!p.idNumber && draftIdNumber === p.idNumber;
      const phoneMatch = phonesMatch(draftPhone, fullPhone(p));
      const nameDobMatch = !!draftName && !!draftDob && !!p.dob &&
        draftName === normalisePersonName(p.name) && draftDob === p.dob;
      const patientSex = p.sexAtBirth || p.gender || "";
      const sexComparable = !!draftSex && !!patientSex;
      const sexMatch = sexComparable && draftSex === patientSex;
      const sexMismatch = sexComparable && draftSex !== patientSex;

      // v12 requires any one of the three signals to flag a possible duplicate:
      // national ID exact, phone exact/normalised, or name + DOB exact.
      const isDuplicateRisk = idMatch || phoneMatch || nameDobMatch;
      if (!isDuplicateRisk) return null;

      const signals = [];
      if (idMatch) signals.push("national ID");
      if (phoneMatch) signals.push("phone");
      if (nameDobMatch) signals.push("name + DOB");

      return {
        patient: p,
        signals,
        score: scoreCollision({ idMatch, phoneMatch, nameDobMatch, sexMatch, sexMismatch }),
        strength: collisionStrength({ idMatch, phoneMatch, nameDobMatch, sexMatch }),
        index,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

export function findBestPatientCollision(draft, patients = []) {
  const candidates = findPatientCollisionCandidates(draft, patients);
  if (candidates.length === 0) return null;
  return {
    ...candidates[0],
    candidateCount: candidates.length,
    candidateIds: candidates.map(c => c.patient.id),
  };
}
