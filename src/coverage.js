// Mock insurer coverage map shared by catalogue, cart, and payment.
// In production this is populated from Step 3 eligibility / insurer APIs.
export const MOCK_COVERAGE = {
  cbc: { covered: 80 },
  glucose: { covered: 80 },
  hba1c: { covered: 80 },
  lipid: { covered: 80 },
  urinalysis: { covered: 60 },
  lft: { covered: 80 },
  kft: { covered: 80 },
  tsh: { covered: 80 },
  amh: { covered: 0 },
  preg: { covered: 0 },
  "preg-bhcg": { covered: 0 },
  hbsag: { covered: 80 },
  "xray-chest": { covered: 60 },
  "us-pelvis": { covered: 0 },
  "ct-head": { covered: 100, preauth: true },
  "mri-brain": { covered: 100, preauth: true },
  "ecg-12": { covered: 80 },
  "vit-bp": { covered: 100 },
  "vit-bmi": { covered: 100 },
};

export function getCoverage(testId, insurance = []) {
  const policies = insurance || [];
  const eligiblePolicy = policies.find(p => p.eligibility?.state === "eligible") || policies[0];
  if (!eligiblePolicy) return null;
  const c = MOCK_COVERAGE[testId];
  const insurer = eligiblePolicy.provider || "Insurer";
  if (!c) return { kind: "unconfirmed", insurer };
  if (c.preauth) return { kind: "preauth", insurer };
  if (c.covered === 0) return { kind: "not-covered", insurer };
  return { kind: "covered", percent: c.covered, insurer };
}

export function coveragePaymentShare(testId, insurance = []) {
  const coverage = getCoverage(testId, insurance);
  if (!coverage || coverage.kind === "not-covered" || coverage.kind === "unconfirmed") return { payer: "direct", coverage };
  if (coverage.kind === "preauth") return { payer: "preauth", coverage };
  return { payer: "insurance", coverage };
}
