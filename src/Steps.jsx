// === Steps.jsx — 4-step wizard content components ===
//   v2.1:
//
//   Step 1 (Identity): search returning patients + 3 capture methods (QR / NFC / Manual)
//   Step 2 (Review):   confirm captured details with field-locking + masked DOB
//   Step 3 (Insurance):manage insurance policies (default = no insurance)
//   Step 4 (Orders):   catalogue + AI side panel + previous tests + telehealth
//
//   Payment + check-in CTA live in the always-visible cart rail (no Step 5 panel).
//   Each step receives { patient, onUpdate, onNext, onPrev, onPushToast } and renders
//   inside the wizard shell. They share the sticky right cart (rendered by App).
//
import React, { useState, useEffect, useMemo, useRef } from "react";
import { I } from "./icons";
import { useLang, VISIT_REASON_KEYS, VISIT_REASON_POPULAR } from "./i18n";
import { ORDER_CATALOG, paymentAfterPaidEdit, useCartPayment, PaymentArea, paymentDueAmount } from "./OrderCart";
import { DisabledTooltip, VisitReasonPills, VISIT_REASONS, AuthorBadge, SLOT_OPTIONS, computeTatPlan, fmtTatHours } from "./shared";
import { coveragePaymentShare } from "./coverage";
import { LAB_CATALOG, LAB_CATEGORIES, INSURANCE_PROVIDERS } from "./data";
import { AddTestsPanel, BookingCodeSection } from "./AddTestsPanel";
import { DateInput, GhostPlaceholder, formatByPattern, digitsOnly } from "./DateInput";
import { findPatientCollisionCandidates } from "./patientMatching";
import scanQrIcon from "./assets/icons/identity-scan-qr.svg";
import idCardIcon from "./assets/icons/identity-id-card.svg";
import manualEntryIcon from "./assets/icons/identity-manual-entry.svg";
import intakePhoneFormIcon from "./assets/icons/intake-phone-form.svg";
import insuranceEmptyStateIcon from "./assets/icons/insurance-empty-state.svg";
import insurancePolicyIcon from "./assets/icons/insurance-policy.svg";
import directPayCheckIcon from "./assets/icons/direct-pay-check.svg";
import teleconsultationIcon from "./assets/icons/teleconsultation.svg";

const KHR_RATE = 4100;
const fmtCcy = (usd, ccy = "USD") => ccy === "KHR" ? "៛" + Math.round(usd * KHR_RATE).toLocaleString() : "$" + usd.toFixed(2);

// === Shared bits ===
function StepShell({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={"step-shell" + (className ? " " + className : "")}>
      <header className="step-head">
        <div>
          <h1 className="step-title">{title}</h1>
          {subtitle && <p className="step-sub">{subtitle}</p>}
        </div>
        {right && <div className="step-head-right">{right}</div>}
      </header>
      <div className="step-body">{children}</div>
    </div>
  );
}

function StepFooter({ onPrev, onNext, nextLabel, nextDisabled, blockers, secondary, showBlockerChip = true, className = "" }) {
  const t = useLang();
  const ref = useRef(null);
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (getComputedStyle(el).position !== "sticky") return;
    const check = () => {
      const reached = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setAtBottom(reached);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return (
    <div
      ref={ref}
      className={"step-footer" + (className ? " " + className : "") + (atBottom ? " is-at-bottom" : "")}
    >
      <div className="step-footer-left">
        {onPrev && (
          <button type="button" className="btn btn-ghost" onClick={onPrev}>
            <I.ChevronLeft size={13} /> {t("step.back")}
          </button>
        )}
        {secondary}
      </div>
      <div className="step-footer-right">
        {onNext && showBlockerChip && nextDisabled && blockers && blockers.length > 0 && (
          <span className="step-footer-blocker">
            <I.AlertCircle size={11} /> {blockers[0]}
          </span>
        )}
        {onNext && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNext}
            disabled={nextDisabled}
          >
            {nextLabel || t("step.next")} <I.ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// STEP 1 — Identity
// =====================================================================
//   Search returning patient OR pick a capture method (QR / NFC / Manual).
//   QR/NFC auto-populate name+dob+sex+id and lock those fields.
//   Manual moves directly to Step 2 with empty form.
//
export function Step1Identity({ patient, onUpdate, onNext, onPushToast, allPatients = [], onSelectPatient, gate, blankState = false }) {
  const t = useLang();
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [scanState, setScanState] = useState("idle"); // idle | scanning | done
  const [scanCollisions, setScanCollisions] = useState([]);
  const [drawerPatientId, setDrawerPatientId] = useState(null);
  // Spec v12 §Step 1: NFC is "coming soon" — visible, disabled, COMING SOON badge.
  const [nfcAvailable] = useState(false);
  const [recapturing, setRecapturing] = useState(false);
  const [recaptureConfirmOpen, setRecaptureConfirmOpen] = useState(false);
  const bookingInCart = useMemo(
    () => new Set((patient.cart?.items || []).map(i => i.id)),
    [patient.cart?.items]
  );

  // Revisit detection — if minimum identity is captured, the step's job becomes
  // "confirm + continue", not "capture from scratch". Step 2 already follows this
  // pattern (locked-field chips); Step 1 must mirror it on revisit.
  const captured = !!(patient.name && patient.dob && patient.sexAtBirth);
  const showCapturedHero = captured && !recapturing;

  const matches = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase();
    return allPatients.filter(p => {
      const bookingCodes = [
        p.bookingCode,
        ...(p.bookingCodes || []),
        ...(p.consumedBookingCodes || []),
      ].filter(Boolean).join(" ");
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.nameKhmer || "").toLowerCase().includes(q) ||
        (p.phoneNumber || "").includes(q) ||
        (p.mobile || "").includes(q) ||
        (p.idNumber || "").toLowerCase().includes(q) ||
        bookingCodes.toLowerCase().includes(q)
      );
    }).slice(0, 5);
  }, [searchQ, allPatients]);

  const drawerPatient = drawerPatientId ? allPatients.find(p => p.id === drawerPatientId) : null;

  const handleOverrideCollision = (collisionToAck, pin) => {
    const id = collisionToAck?.patient?.id;
    const next = commitCollisionOverride(patient, collisionToAck, pin);
    if (!id || !next) return false;
    onUpdate(next);
    setScanCollisions(prev => prev.filter(c => c.patient.id !== id));
    onPushToast?.("Override accepted · supervisor PIN logged", "success");
    return true;
  };

  const handleQRScan = () => {
    setScanState("scanning");
    setTimeout(() => {
      setScanState("done");
      const data = {
        name: patient.name || "Maya Tran",
        dob: patient.dob || "1996-02-14",
        sexAtBirth: patient.sexAtBirth || "Female",
        idNumber: patient.idNumber || "012345678",
        idScanned: true,
        identity: {
          ...(patient.identity || {}),
          verified: true,
          source: "qr",
          lockedFields: ["name", "dob", "sexAtBirth", "idNumber"],
          scannedAt: new Date().toISOString(),
        },
      };
      const next = { ...patient, ...data, collisionAcked: [] };
      const collisions = findPatientCollisionCandidates(next, allPatients);
      onUpdate(next);
      if (collisions.length > 0) {
        setScanCollisions(collisions);
        onPushToast?.("Possible duplicate found — review before continuing", "error");
        return;
      }
      onPushToast?.("National ID scanned — name, DOB, sex auto-filled & locked", "success");
      setTimeout(() => onNext(), 600);
    }, 1100);
  };

  const handleNFCRead = () => {
    if (!nfcAvailable) return;
    onPushToast?.("NFC reader simulating chip read…", "success");
    setTimeout(() => {
      onUpdate({
        ...patient,
        idScanned: true,
        identity: {
          ...(patient.identity || {}),
          verified: true,
          source: "chip",
          lockedFields: ["name", "dob", "sexAtBirth", "idNumber"],
          scannedAt: new Date().toISOString(),
        },
      });
      onPushToast?.("Chip read complete — fields locked", "success");
      setTimeout(() => onNext(), 600);
    }, 1100);
  };

  const handleManual = () => {
    onUpdate({
      ...patient,
      manualEntry: true,
      idScanned: false,
      identity: { ...(patient.identity || {}), verified: false, source: "manual", lockedFields: [] },
    });
    onPushToast?.("Manual entry — fill details in Step 2", "success");
    setTimeout(() => onNext(), 100);
  };

  const handleSelectExisting = (p) => {
    onSelectPatient?.(p.id);
    onPushToast?.(`Loaded ${p.name} · ${p.queueNumber}`, "success");
    setSearchQ("");
  };

  const handleApplyBookingCode = (items, code) => {
    const currentCart = patient.cart || {
      items: [],
      promos: {},
      splits: null,
      ccy: "USD",
      payment: { method: null, status: "idle", tendered: "" },
      pregnancyConsent: null,
    };
    const existingIds = new Set((currentCart.items || []).map(i => i.id));
    const fresh = items.filter(i => !existingIds.has(i.testId || i.id));
    if (fresh.length === 0) {
      onPushToast?.("All booking orders are already in cart", "error");
      return;
    }
    const additions = fresh.map(item => {
      const id = item.testId || item.id;
      const c = ORDER_CATALOG.find(c => c.id === id) || {};
      return {
        id,
        kind: item.kind || c.kind || "lab",
        name: item.name || c.name,
        price: item.price ?? c.price,
        qty: 1,
        payer: patient.payer || "direct",
        status: "pending",
        source: "booking",
        bookingCode: code,
      };
    });
    const consumedBookingCodes = Array.from(new Set([...(patient.consumedBookingCodes || []), code]));
    onUpdate({
      ...patient,
      consumedBookingCodes,
      cart: {
        ...currentCart,
        items: [...(currentCart.items || []), ...additions],
        payment: paymentAfterPaidEdit(currentCart.payment, "normal"),
      },
    });
    onPushToast?.(`Booking code ${code} applied · ${additions.length} order${additions.length === 1 ? "" : "s"} staged`, "success");
  };

  const handleLoadDrawerPatient = () => {
    if (!drawerPatient) return;
    handleSelectExisting(drawerPatient);
    setDrawerPatientId(null);
    setScanCollisions([]);
  };

  const sourceLabel = (() => {
    const s = patient.identity?.source;
    if (s === "qr") return "QR scan";
    if (s === "chip") return "NFC chip";
    if (s === "manual") return "Manual entry";
    return "Existing record";
  })();

  const sourceIcon = (() => {
    const s = patient.identity?.source;
    if (s === "qr") return I.Camera;
    if (s === "chip") return I.CreditCard;
    if (s === "manual") return I.Edit;
    return I.User;
  })();

  const fmtCapturedAt = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return null; }
  };

  const fmtDob = (iso) => {
    return formatDobDisplay(iso);
  };

  const lockedCount = (patient.identity?.lockedFields || []).length;
  const capturedAt = fmtCapturedAt(patient.identity?.scannedAt);

  if (showCapturedHero) {
    const SourceIco = sourceIcon;
    return (
      <StepShell title={t("step1.title")} subtitle={t("step1.sub")}>
        <section className="id-captured-card">
          <div className="id-captured-head">
            <div className="id-captured-icon"><I.CheckCircle size={20} /></div>
            <div className="id-captured-titles">
              <div className="id-captured-eyebrow">Identity captured</div>
              <div className="id-captured-name">{patient.name}</div>
            </div>
            <button
              type="button"
              className="link-btn id-captured-recap"
              onClick={() => setRecaptureConfirmOpen(true)}
            >
              <I.RefreshCw size={11} /> Re-capture
            </button>
          </div>

          <dl className="id-captured-grid">
            <div className="id-captured-cell">
              <dt>Date of birth</dt>
              <dd>{fmtDob(patient.dob)}</dd>
            </div>
            <div className="id-captured-cell">
              <dt>Sex at birth</dt>
              <dd>{patient.sexAtBirth || "—"}</dd>
            </div>
            <div className="id-captured-cell">
              <dt>National ID</dt>
              <dd>{patient.idNumber || <span className="id-captured-muted">Not provided</span>}</dd>
            </div>
            <div className="id-captured-cell">
              <dt>Phone</dt>
              <dd>{patient.phoneNumber ? `${patient.countryCode || "+855"} ${patient.phoneNumber}` : <span className="id-captured-muted">Not provided</span>}</dd>
            </div>
          </dl>

          <div className="id-captured-meta">
            <span className="id-captured-chip">
              <SourceIco size={10} /> Captured via {sourceLabel}
              {capturedAt && <span className="id-captured-chip-sep"> · {capturedAt}</span>}
            </span>
            {lockedCount > 0 && (
              <span className="id-captured-chip id-captured-chip-locked">
                <I.Lock size={10} /> {lockedCount} field{lockedCount === 1 ? "" : "s"} locked
              </span>
            )}
            <span className="id-captured-hint">
              Edit details on Step 2 — locked fields require an unlock first.
            </span>
          </div>
        </section>

        <section className="card-soft step1-booking-card">
          <BookingCodeSection
            patient={patient}
            inCart={bookingInCart}
            onAddBundle={handleApplyBookingCode}
            onPushToast={onPushToast}
            ccy={patient.cart?.ccy || "USD"}
            className="step1-booking"
            introTitle="Booking / referral code"
            introText="Use this early when the patient brings a prescription, QR, or teleconsult summary. Orders are staged now and reviewed in Step 4."
          />
        </section>

        {recaptureConfirmOpen && (
          <div className="unlock-confirm">
            <I.AlertTriangle size={12} className="unlock-confirm-ico" />
            <div className="unlock-confirm-body">
              <div className="unlock-confirm-title">Re-capture identity?</div>
              <div className="unlock-confirm-sub">
                You'll start over with QR / NFC / manual. Captured data stays until a new method overwrites it.
              </div>
            </div>
            <div className="unlock-confirm-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRecaptureConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => { setRecaptureConfirmOpen(false); setRecapturing(true); }}
              >
                Yes, re-capture
              </button>
            </div>
          </div>
        )}

        {scanCollisions.length > 0 && (
          <div className="collision-stack">
            {scanCollisions.map(c => (
              <CollisionBanner
                key={c.patient.id}
                patient={patient}
                collision={c}
                onView={setDrawerPatientId}
                onDismiss={handleOverrideCollision}
              />
            ))}
          </div>
        )}

        <StepFooter
          onNext={onNext}
          nextDisabled={!gate.step1Done || scanCollisions.length > 0}
          blockers={scanCollisions.length > 0 ? ["Resolve possible duplicate patient"] : gate.blockers[1]}
          showBlockerChip={!blankState}
        />
        <PatientRecordDrawer
          patient={drawerPatient}
          open={!!drawerPatient}
          onClose={() => setDrawerPatientId(null)}
          onLoad={handleLoadDrawerPatient}
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      title={t("step1.title")}
      subtitle={t("step1.sub")}
      right={recapturing && captured ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRecapturing(false)}>
          <I.ChevronLeft size={11} /> Back to captured identity
        </button>
      ) : null}
    >
      {/* Search returning patients */}
      <section className="card-soft">
        <div className="search-wrap">
          <I.Search size={14} className="search-ico" />
          <input
            type="text"
            className="input search-input"
            placeholder={t("step1.search.placeholder")}
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          {searchQ && (
            <button type="button" className="search-clear" onClick={() => setSearchQ("")}>
              <I.X size={11} />
            </button>
          )}
        </div>
        {matches.length > 0 && (
          <div className="search-results">
            {matches.map(p => (
              <button key={p.id} type="button" className="search-result" onClick={() => handleSelectExisting(p)}>
                <span className="search-result-avatar">{p.initials}</span>
                <span className="search-result-info">
                  <span className="search-result-name">{p.name}</span>
                  <span className="search-result-meta">{p.queueNumber} · {p.dob} · {p.phoneNumber}</span>
                </span>
                <I.ArrowRight size={12} />
              </button>
            ))}
          </div>
        )}
        {searchQ.trim() && matches.length === 0 && (
          <div className="search-empty">
            <I.Inbox size={14} /> {t("step1.search.noMatch")}
          </div>
        )}
      </section>

      <section className="card-soft step1-booking-card">
        <BookingCodeSection
          patient={patient}
          inCart={bookingInCart}
          onAddBundle={handleApplyBookingCode}
          onPushToast={onPushToast}
          ccy={patient.cart?.ccy || "USD"}
          className="step1-booking"
          introTitle="Booking / referral code"
          introText="Start here when the patient already has a booking, prescription, or teleconsult code. The order is staged before insurance and payment."
        />
      </section>

      {scanCollisions.length > 0 && (
        <div className="collision-stack">
          {scanCollisions.map(c => (
            <CollisionBanner
              key={c.patient.id}
              patient={patient}
              collision={c}
              onView={setDrawerPatientId}
              onDismiss={handleOverrideCollision}
            />
          ))}
        </div>
      )}

      {/* OR divider */}
      <div className="step1-or">
        <span className="step1-or-line" />
        <span className="step1-or-text">{t("step1.or")}</span>
        <span className="step1-or-line" />
      </div>

      {/* Capture methods */}
      <div className="step1-methods">
        {/* QR */}
        <button
          type="button"
          className={"method-card" + (scanState === "scanning" ? " is-busy" : "")}
          onClick={handleQRScan}
          disabled={scanState === "scanning"}
        >
          <div className="method-card-ico method-card-ico-qr">
            <img className="method-card-icon-img" src={scanQrIcon} alt="" aria-hidden="true" />
            {scanState === "scanning" && <span className="method-spinner" />}
          </div>
          <div className="method-card-body">
            <div className="method-card-title">{t("step1.method.qr.title")}</div>
            <div className="method-card-sub">{t("step1.method.qr.sub")}</div>
          </div>
          <div className="method-card-cta">
            {scanState === "scanning" ? t("step1.method.scanning") : t("step1.method.start")}
          </div>
        </button>

        {/* NFC */}
        <button
          type="button"
          className={"method-card" + (!nfcAvailable ? " is-disabled" : "")}
          onClick={handleNFCRead}
          disabled={!nfcAvailable}
          title={!nfcAvailable ? t("step1.method.nfc.unavailable") : ""}
        >
          <div className="method-card-ico method-card-ico-nfc">
            <img className="method-card-icon-img" src={idCardIcon} alt="" aria-hidden="true" />
          </div>
          <div className="method-card-body">
            <div className="method-card-title">
              {t("step1.method.nfc.title")}
              {!nfcAvailable && <span className="coming-soon-badge">COMING SOON</span>}
            </div>
            <div className="method-card-sub">
              {nfcAvailable ? t("step1.method.nfc.sub") : "NFC reader integration in progress"}
            </div>
          </div>
          <div className="method-card-cta">{nfcAvailable ? t("step1.method.start") : "—"}</div>
        </button>

        {/* Manual */}
        <button type="button" className="method-card" onClick={handleManual}>
          <div className="method-card-ico method-card-ico-manual">
            <img className="method-card-icon-img" src={manualEntryIcon} alt="" aria-hidden="true" />
          </div>
          <div className="method-card-body">
            <div className="method-card-title">{t("step1.method.manual.title")}</div>
            <div className="method-card-sub">{t("step1.method.manual.sub")}</div>
          </div>
          <div className="method-card-cta">{t("step1.method.start")}</div>
        </button>
      </div>

      <StepFooter
        onNext={onNext}
        nextDisabled={!gate.step1Done || scanCollisions.length > 0}
        blockers={scanCollisions.length > 0 ? ["Resolve possible duplicate patient"] : gate.blockers[1]}
        showBlockerChip={!blankState}
      />
      <PatientRecordDrawer
        patient={drawerPatient}
        open={!!drawerPatient}
        onClose={() => setDrawerPatientId(null)}
        onLoad={handleLoadDrawerPatient}
      />
    </StepShell>
  );
}

// =====================================================================
// STEP 2 — Review & Confirm
// =====================================================================
function MaskedDob({ value, onChange, locked, error, placeholder = "DD-MM-YYYY" }) {
  const t = useLang();
  // Stored format: YYYY-MM-DD. Display format: DD-MM-YYYY
  const [draft, setDraft] = useState(() => stringFromIso(value));

  useEffect(() => {
    setDraft(stringFromIso(value));
  }, [value]);

  function stringFromIso(iso) {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso.replace(/[\/\s]+/g, "-"); // fallback
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  function isoFromDigits(digits) {
    if (digits.length !== 8) return null;
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    return `${yyyy}-${mm}-${dd}`;
  }

  const handleChange = (e) => {
    if (locked) return;
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "-" + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + "-" + digits.slice(2, 4) + "-" + digits.slice(4);
    setDraft(formatted);

    if (digits.length === 8) {
      const iso = isoFromDigits(digits);
      if (iso) onChange(iso);
    } else if (digits.length === 0) {
      onChange("");
    }
  };

  const handleClear = () => {
    if (locked) return;
    setDraft("");
    onChange("");
  };

  return (
    <div className={"input-wrap masked-dob" + (locked ? " is-locked" : "") + (error ? " is-error" : "")}>
      <GhostPlaceholder value={locked ? "" : draft} pattern={locked ? "" : placeholder} padRight={30}>
        <input
          type="text"
          inputMode="numeric"
          className={"input ghost-input" + (error ? " invalid" : "") + (locked ? " is-locked" : "")}
          value={draft}
          onChange={handleChange}
          placeholder={locked ? placeholder : ""}
          readOnly={locked}
          maxLength={10}
          style={{ fontVariantNumeric: "tabular-nums", paddingRight: 30 }}
        />
      </GhostPlaceholder>
      {locked
        ? <I.Lock size={13} className="rico" style={{ color: "var(--ink-400)" }} />
        : (draft && <button type="button" className="dob-clear" onClick={handleClear}><I.X size={11} /></button>)
      }
    </div>
  );
}

function ClearableInput({ value, onChange, locked, className = "", ...props }) {
  return (
    <div className={"clearable-input" + (locked ? " is-locked" : "")}>
      <input
        {...props}
        className={"input" + (className ? " " + className : "") + (locked ? " is-locked" : "")}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        readOnly={locked}
      />
      {locked ? (
        <I.Lock size={12} className="clearable-input-ico" />
      ) : !!value && (
        <button type="button" className="clearable-input-btn" onClick={() => onChange("")} aria-label="Clear field">
          <I.X size={11} />
        </button>
      )}
    </div>
  );
}

// =====================================================================
// Visit details — clinical intake the patient owns from their phone,
// with a "fill on behalf" escape hatch for staff. Lives inside Step 2 so
// the receptionist sees the same form their patient sees on their device.
// =====================================================================
function Step2VisitDetails({ patient, onUpdate, onSendIntake, onPushToast, channelReady }) {
  const t = useLang();
  const [filling, setFilling] = useState(false);

  const fields = patient.visitDetails || {
    chiefComplaint: "", medicalHistory: "", medications: "", allergies: "", notes: "",
  };
  const authors = patient.visitDetailsAuthors || {};

  const reasonsLegacy = Array.isArray(patient.visitReason)
    ? patient.visitReason
    : (patient.visitReason ? [patient.visitReason] : []);
  const visitReason = Array.isArray(fields.visitReason) && fields.visitReason.length
    ? fields.visitReason
    : reasonsLegacy;

  const setField = (k, v) => onUpdate({
    ...patient,
    visitDetails: { ...fields, visitReason, [k]: v },
    visitDetailsAuthors: { ...authors, [k]: "nurse" },
  });

  const sensitiveItems = (patient.cart?.items || []).filter(i => i.kind === "imaging" || /hiv|sti|genetic/i.test(i.name || ""));
  const femaleRequired = (patient.sexAtBirth || patient.gender) === "Female";
  const womenFilled = !femaleRequired || !!(fields.womensHealth || "").trim();
  const sensitiveFilled = sensitiveItems.length === 0 || !!(fields.sensitiveConsent || "").trim();

  // v12 PWA architecture: 8 adaptive intake sections. The nurse sees the same
  // high-level sections as the patient PWA, with structured fallback fields.
  const sections = [
    { key: "today",          label: "Today's visit",          filled: visitReason.length > 0 && !!(fields.chiefComplaint || "").trim(), preview: [visitReason.join(" · "), fields.chiefComplaint].filter(Boolean).join(" · ") },
    { key: "prep",           label: "Pre-test prep",          filled: !!(fields.preTestPrep || "").trim(),       preview: fields.preTestPrep },
    { key: "medications",    label: "Medications & supplements", filled: !!(fields.medications || "").trim(),    preview: fields.medications },
    { key: "womensHealth",   label: "Women's health",         filled: womenFilled,                               preview: femaleRequired ? fields.womensHealth : "Not applicable" },
    { key: "recentEvents",   label: "Recent health events",   filled: !!(fields.recentEvents || "").trim(),      preview: fields.recentEvents },
    { key: "lifestyle",      label: "Lifestyle snapshot",     filled: !!(fields.lifestyle || "").trim(),         preview: fields.lifestyle },
    { key: "sampleComfort",  label: "Sample comfort",         filled: !!(fields.sampleComfort || "").trim(),     preview: fields.sampleComfort },
    { key: "sensitiveConsent", label: "Consent & sensitive tests", filled: sensitiveFilled,                      preview: sensitiveItems.length === 0 ? "No sensitive tests" : fields.sensitiveConsent },
  ];
  const filledCount = sections.filter(s => s.filled).length;
  const total = sections.length;
  const allComplete = filledCount === total;
  const pwaSent = !!patient.pwaSent;

  const status = allComplete
    ? { tone: "success", labelKey: "vd.status.complete", Ico: I.CheckCircle }
    : filling
      ? { tone: "info", labelKey: "vd.status.filling", Ico: I.Edit }
      : pwaSent
        ? { tone: "warn", labelKey: filledCount > 0 ? "vd.status.inProgress" : "vd.status.waiting", Ico: I.Clock }
        : { tone: "muted", labelKey: "vd.status.notStarted", Ico: I.Clock };
  const StatusIco = status.Ico;

  const handleSend = () => {
    onSendIntake?.({ ...patient, pwaSent: true, pwaSentAt: "just now" });
  };
  const handleResend = () => {
    onSendIntake?.({ ...patient, pwaSent: true, pwaSentAt: "just now" });
    onPushToast?.(t("vd.resend"), "success");
  };

  const renderField = (key, labelKey, placeholderKey, multiline) => {
    const val = fields[key] || "";
    const hasVal = !!val.trim();
    return (
      <div className="field" style={{ gridColumn: multiline ? "1 / -1" : undefined }}>
        <label className="label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {t(labelKey)}
          {authors[key] && hasVal && <AuthorBadge who={authors[key]} t={t} />}
        </label>
        {multiline ? (
          <textarea
            className="input"
            value={val}
            onChange={e => setField(key, e.target.value)}
            placeholder={t(placeholderKey)}
            rows={2}
            style={{ resize: "vertical", fontFamily: "inherit", padding: "8px 12px" }}
          />
        ) : (
          <input
            type="text"
            className="input"
            value={val}
            onChange={e => setField(key, e.target.value)}
            placeholder={t(placeholderKey)}
          />
        )}
      </div>
    );
  };

  return (
    <section className="card-soft">
      <div className="group-head">
        <h3 className="group-title">{t("vd.title")}</h3>
        <span className={"vd2-pill vd2-pill-" + status.tone}>
          <StatusIco size={10} />
          <span className="vd2-pill-count">{filledCount}/{total}</span>
          <span className="vd2-pill-sep">·</span>
          {t(status.labelKey)}
        </span>
      </div>

      {/* Context strip — three discrete states:
           1. Complete  → minimal inline meta + Edit (status pill already conveys "done")
           2. Awaiting  → patient is filling on their phone
           3. Idle      → not yet sent, offer Send link / Fill here */}
      {!filling && allComplete && (
        <div className="vd2-complete-meta">
          <span className="vd2-complete-meta-text">
            {patient.pwaSentAt
              ? <>{t("vd.sent")} {patient.pwaSentAt}</>
              : t("vd.subComplete")}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilling(true)}>
            <I.Edit size={11} /> {t("vd.editFields")}
          </button>
        </div>
      )}

      {!filling && !allComplete && pwaSent && (
        <div className="vd2-prompt vd2-prompt-sent">
          <div className="vd2-prompt-icon"><I.Smartphone size={14} /></div>
          <div className="vd2-prompt-body">
            <div className="vd2-prompt-title">{t("vd.subPatientCompletes")}</div>
            <div className="vd2-prompt-sub">
              {filledCount} / {total}
              {patient.pwaSentAt && <> · {t("vd.sent")} {patient.pwaSentAt}</>}
            </div>
          </div>
          <div className="vd2-prompt-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleResend}>
              <I.RefreshCw size={11} /> {t("vd.resend")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilling(true)}>
              <I.Edit size={11} /> {t("vd.fillOnBehalf")}
            </button>
          </div>
        </div>
      )}

      {!filling && !allComplete && !pwaSent && (
        <div className="vd2-prompt">
          <div className="vd2-prompt-icon"><I.Smartphone size={14} /></div>
          <div className="vd2-prompt-body">
            <div className="vd2-prompt-title">{t("vd.heroTitle")}</div>
            <div className="vd2-prompt-sub">{t("vd.heroBody")}</div>
          </div>
          <div className="vd2-prompt-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFilling(true)}
            >
              <I.Edit size={11} /> {t("vd.fillOnBehalf")}
            </button>
            <DisabledTooltip
              disabled={!channelReady}
              title={t("disabled.intake.title")}
              reasons={[t("disabled.intake.channel")]}
            >
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!channelReady}
                onClick={handleSend}
              >
                <I.Send size={11} /> {t("vd.sendIntakeLink")}
              </button>
            </DisabledTooltip>
          </div>
        </div>
      )}

      {/* Compact checklist — renders in all read-only states (idle, waiting,
         complete) so the receptionist always sees per-section status with
         previews. Replaces the prose inside the prompt above with a
         structured, status-aware view. */}
      {!filling && (
        <ul className="vd2-checklist" aria-label={t("vd.progress.title")}>
          {sections.map(s => (
            <li key={s.key} className={"vd2-check" + (s.filled ? " filled" : "")}>
              <span className="vd2-check-mark" aria-hidden="true">
                {s.filled && <I.Check size={9} strokeWidth={3} />}
              </span>
              <span className="vd2-check-label">{s.label || t(s.labelKey)}</span>
              {s.filled && s.preview ? (
                <span className="vd2-check-preview" title={s.preview}>{s.preview}</span>
              ) : (
                <span className="vd2-check-pending">{t("vd.progress.pending")}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {filling && (
        <>
          <div className="vd2-fill-bar">
            <span className="vd2-fill-bar-text">
              <I.Edit size={11} /> {t("vd.subFilling")}
            </span>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setFilling(false)}
            >
              <I.Check size={11} /> {t("vd.done")}
            </button>
          </div>

          <div className="form-grid form-grid-2">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("vd.visitReason")} <span className="req">*</span>
                {authors.visitReason && visitReason.length > 0 && <AuthorBadge who={authors.visitReason} t={t} />}
              </label>
              <VisitReasonPills
                value={visitReason}
                onChange={v => setField("visitReason", v)}
                options={VISIT_REASON_KEYS.map((key, i) => ({
                  value: VISIT_REASONS[i],
                  label: t(key),
                  popular: VISIT_REASON_POPULAR.has(key),
                }))}
                placeholder={t("vd.visitReason")}
              />
            </div>
            {renderField("chiefComplaint", "vd.chiefComplaint", "vd.chiefComplaint.placeholder", true)}
            {renderField("medicalHistory", "vd.medicalHistory", "vd.medicalHistory.placeholder", true)}
            {renderField("preTestPrep", "Pre-test prep", "Food, alcohol, exercise, hydration, urine timing", true)}
            {renderField("medications", "vd.medications", "vd.medications.placeholder", true)}
            {femaleRequired && renderField("womensHealth", "Women's health", "LMP, pregnancy possibility, breastfeeding, contraception, HRT", true)}
            {renderField("recentEvents", "Recent health events", "Illness, vaccine, surgery, travel, injury, sleep", true)}
            {renderField("lifestyle", "Lifestyle snapshot", "Smoking, alcohol, exercise, diet", true)}
            {renderField("sampleComfort", "Sample collection comfort", "Fainting history, preferred arm, difficult veins, latex allergy, PICC/fistula", true)}
            {sensitiveItems.length > 0 && renderField("sensitiveConsent", "Consent & sensitive tests", "Digital consent status, authorised third parties, supervisor witness if verbal", true)}
            {renderField("allergies", "vd.allergies", "vd.allergies.placeholder", false)}
          </div>
        </>
      )}
    </section>
  );
}

// Spec v12 §2 — choose-channel-first contact panel
//   Two pills (Telegram / SMS). Nothing else shown until one is selected.
//   - Telegram: pushes QR to CFD on pill select; auto-verifies; phone field
//     auto-populates from Telegram (no OTP needed).
//   - SMS: phone input is shown; OTP boxes auto-appear and auto-focus when a
//     valid number is entered (no separate "Send OTP" tap).
function ChannelChooser({
  patient, update, phoneValid, otpStep, setOtpStep, otpCode, setOtpCode,
  otpCountdown, tgPanel, setTgPanel, handleSendOtp, handleVerifyOtp, handleTgQr, t,
  handleTgCancel,
}) {
  const [channel, setChannel] = useState(null); // null | "telegram" | "sms"
  const otpRefs = useRef([]);
  const selectChannel = (next) => {
    if (next !== "telegram") handleTgCancel?.();
    setChannel(next);
  };
  // When SMS channel is chosen + phone reaches min length, auto-send OTP once
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (channel !== "sms") return;
    if (!phoneValid) { autoSentRef.current = false; return; }
    if (otpStep === "idle" && !autoSentRef.current) {
      autoSentRef.current = true;
      handleSendOtp();
    }
  }, [channel, phoneValid, otpStep, handleSendOtp]);
  // When Telegram channel is chosen, push the QR immediately to the CFD.
  useEffect(() => {
    if (channel === "telegram" && tgPanel === "idle") handleTgQr();
  }, [channel, tgPanel, handleTgQr]);
  useEffect(() => {
    if (channel !== "sms" || otpStep !== "sent") return;
    const id = requestAnimationFrame(() => {
      const firstEmpty = otpRefs.current.find((input, idx) => input && !otpCode[idx]);
      (firstEmpty || otpRefs.current[0])?.focus?.();
    });
    return () => cancelAnimationFrame(id);
  }, [channel, otpStep, otpCode]);

  return (
    <div className="contact-chooser">
      <div className="contact-chooser-prompt">How does the patient prefer to be contacted?</div>
      <div className="contact-chooser-pills" role="radiogroup" aria-label="Contact channel">
        <button
          type="button"
          role="radio"
          aria-checked={channel === "telegram"}
          className={"contact-chooser-pill" + (channel === "telegram" ? " is-on" : "")}
          onClick={() => selectChannel("telegram")}
        >
          <I.Send size={13} /> Telegram
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={channel === "sms"}
          className={"contact-chooser-pill" + (channel === "sms" ? " is-on" : "")}
          onClick={() => selectChannel("sms")}
        >
          <I.MessageSquare size={13} /> SMS
        </button>
      </div>

      {channel === "telegram" && (
        <div className="contact-card contact-card-tg">
          <div className="contact-card-head">
            <span className="contact-card-ico" style={{ color: "#229ed9" }}><I.Send size={13} /></span>
            <span className="contact-card-title">Telegram QR pushed to display</span>
          </div>
          <div className="contact-card-body contact-card-qr">
            <div className="qr-mock"><I.Smartphone size={26} /></div>
            <div className="contact-card-help">{t("step2.tg.scanning") || "Waiting for patient to scan on the display…"}</div>
            <button type="button" className="link-btn" onClick={() => { handleTgCancel?.(); setChannel(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {channel === "sms" && (
        <div className="contact-card contact-card-sms">
          <div className="contact-card-head">
            <span className="contact-card-ico" style={{ color: "#268cff" }}><I.MessageSquare size={13} /></span>
            <span className="contact-card-title">Mobile *</span>
          </div>
          <div className="contact-card-body">
            <div className="phone-row">
              <select
                className="select"
                value={patient.countryCode || "+855"}
                onChange={e => update("countryCode", e.target.value)}
                style={{ width: 72 }}
              >
                <option>+855</option>
                <option>+84</option>
                <option>+66</option>
                <option>+1</option>
              </select>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className="input"
                value={patient.phoneNumber || ""}
                onChange={e => update("phoneNumber", e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="12 345 678"
                autoFocus
              />
            </div>
            {phoneValid && (otpStep === "sending" || otpStep === "sent") && (
              <div className="otp-row">
                <div className="otp-boxes">
                  {[0,1,2,3,4,5].map(i => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      className={"otp-box" + (otpCode[i] ? " has-val" : "")}
                      maxLength={1}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otpCode[i] || ""}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "").slice(-1);
                        const next = otpCode.split("");
                        next[i] = v;
                        const joined = next.join("").slice(0, 6);
                        setOtpCode(joined);
                        if (v && i < 5) {
                          otpRefs.current[i + 1]?.focus();
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === "Backspace" && !otpCode[i] && i > 0) {
                          otpRefs.current[i - 1]?.focus();
                        }
                      }}
                      autoFocus={i === 0 && otpStep === "sent"}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6}
                >
                  {t("step2.verify")}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={handleSendOtp}
                  disabled={otpCountdown > 0}
                >
                  {otpCountdown > 0 ? `${t("step2.resendIn")} ${otpCountdown}s` : t("step2.resend")}
                </button>
              </div>
            )}
            {!phoneValid && (
              <div className="contact-card-help">Enter a valid number — OTP will send automatically.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Spec v12 §Step 2 — Patient KHQR capture (optional) for refunds
function PatientKhqrCapture({ patient, onUpdate, onPushToast, t }) {
  const captured = patient.bakong || null;
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const mockScan = () => {
    const fakeId = "12345" + Math.floor(100 + Math.random() * 900);
    onUpdate({
      ...patient,
      bakong: {
        provider: "Bakong",
        accountId: fakeId,
        accountName: patient.name || "Patient",
        capturedAt: new Date().toISOString(),
      },
    });
    onPushToast?.(`Bakong captured · #${fakeId}`, "success");
  };
  const saveManual = () => {
    const v = manualValue.trim();
    if (!v) return;
    onUpdate({
      ...patient,
      bakong: { provider: "Bakong", accountId: v, accountName: patient.name || "Patient", capturedAt: new Date().toISOString(), source: "manual" },
    });
    setManualOpen(false);
    setManualValue("");
    onPushToast?.(`Bakong account saved`, "success");
  };
  const remove = () => onUpdate({ ...patient, bakong: null });

  if (captured) {
    return (
      <div className="patient-khqr is-captured">
        <I.CreditCard size={13} />
        <strong>Bakong · {captured.accountName}</strong>
        <span className="patient-khqr-id">#{captured.accountId}</span>
        <button type="button" className="link-btn" onClick={remove}>Remove</button>
      </div>
    );
  }
  return (
    <div className="patient-khqr">
      <div className="patient-khqr-head">
        <I.CreditCard size={13} />
        <strong>Patient KHQR — for refunds</strong>
        <span className="patient-khqr-optional">optional</span>
      </div>
      <p className="patient-khqr-help">
        If the patient has a Bakong QR, scan it to enable direct refunds to their account.
      </p>
      <div className="patient-khqr-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={mockScan}>
          <I.Camera size={11} /> Scan patient KHQR
        </button>
        <button type="button" className="link-btn" onClick={() => setManualOpen(o => !o)}>
          {manualOpen ? "Hide manual entry" : "Or enter Bakong ID manually"}
        </button>
      </div>
      {manualOpen && (
        <div className="patient-khqr-manual">
          <input
            type="text"
            placeholder="Bakong phone or account ID"
            value={manualValue}
            onChange={e => setManualValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveManual(); }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={saveManual} disabled={!manualValue.trim()}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

const COLLISION_FIELDS = new Set(["name", "dob", "sexAtBirth", "gender", "idNumber", "phoneNumber", "countryCode"]);

function queueOrdinal(patient = {}) {
  const n = Number((patient.queueNumber || "").toString().replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
}

function formatDobDisplay(iso) {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

function collisionCopyFor(currentPatient, collision) {
  const currentQueue = queueOrdinal(currentPatient);
  const targetQueue = queueOrdinal(collision?.patient);
  const targetLooksOlder = targetQueue < currentQueue;
  if (targetLooksOlder) {
    return {
      title: "Possible duplicate patient detected",
      primary: "Open existing patient",
      secondary: "This is a different person",
    };
  }
  return {
    title: "Duplicate record may exist",
    primary: "Review duplicate record",
    secondary: "Keep as separate record",
  };
}

function commitCollisionOverride(patient, collisionToAck, pin, staffId = "Linh Nguyen") {
  const cleanPin = (pin || "").trim();
  const id = collisionToAck?.patient?.id;
  if (!id || cleanPin.length < 4) return null;
  const acked = patient.collisionAcked || [];
  return {
    ...patient,
    collisionAcked: [...new Set([...acked, id])],
    collisionOverrides: [
      ...(patient.collisionOverrides || []),
      {
        patientId: id,
        signals: collisionToAck.signals || [],
        staffId,
        overriddenAt: new Date().toISOString(),
      },
    ],
  };
}

function CollisionBanner({ patient, collision, onView, onDismiss }) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [pin, setPin] = useState("");
  if (!collision) return null;
  const c = collision;
  const copy = collisionCopyFor(patient, c);
  const handleConfirm = (e) => {
    e.preventDefault();
    const accepted = onDismiss?.(c, pin);
    if (accepted === false) return;
    setOverrideOpen(false);
    setPin("");
  };
  return (
    <div className="collision-banner">
      <div className="collision-icon"><I.DuplicateIdentity size={18} strokeWidth={1.9} /></div>
      <div className="collision-body">
        <span className="collision-kicker">{c.strength} · {c.signals.join(" + ")}</span>
        <strong>{copy.title}</strong>
        <p>
          <em>{c.patient.name}</em>
          {c.patient.dob && <> · {formatDobDisplay(c.patient.dob)}</>}
          {c.patient.sexAtBirth && <> · {c.patient.sexAtBirth}</>}
          {c.patient.lastVisitAt && <> · last visit {c.patient.lastVisitAt}</>}
        </p>
      </div>
      <div className="collision-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onView?.(c.patient.id)}>
          {copy.primary}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOverrideOpen(true)}>
          {copy.secondary}
        </button>
      </div>
      {overrideOpen && (
        <form className="collision-override" onSubmit={handleConfirm}>
          <strong>Supervisor PIN required</strong>
          <p>This override is logged with timestamp and staff ID. Cannot be undone without admin intervention.</p>
          <div className="collision-override-row">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-danger btn-sm"
              disabled={pin.length < 4}
            >
              Confirm override
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOverrideOpen(false); setPin(""); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

function PatientRecordDrawer({ patient, open, onClose, onLoad }) {
  if (!open || !patient) return null;
  return (
    <div className="patient-record-drawer" role="dialog" aria-modal="true" aria-label="Existing patient record">
      <button type="button" className="patient-record-drawer-scrim" onClick={onClose} aria-label="Close existing patient drawer" />
      <aside className="patient-record-drawer-panel">
        <header className="patient-record-drawer-head">
          <div className="patient-record-drawer-id">
            <div className="patient-record-drawer-avatar" aria-hidden="true">{patient.initials || "P"}</div>
            <div className="patient-record-drawer-id-text">
              <span className="patient-record-drawer-kicker">Existing record</span>
              <h2>{patient.name || "Unnamed patient"}</h2>
              {patient.idNumber && <span className="patient-record-drawer-sub">ID · {patient.idNumber}</span>}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <I.X size={14} />
          </button>
        </header>
        <div className="patient-record-drawer-body">
          <dl className="patient-record-list">
            <div><dt>DOB</dt><dd>{formatDobDisplay(patient.dob)}</dd></div>
            <div><dt>Sex</dt><dd>{patient.sexAtBirth || patient.gender || "—"}</dd></div>
            <div><dt>Phone</dt><dd>{patient.phoneNumber || patient.mobile || "—"}</dd></div>
            <div><dt>Last visit</dt><dd>{patient.lastVisitAt || patient.arrivedRaw || "—"}</dd></div>
            <div>
              <dt>Status</dt>
              <dd>
                {patient.status?.label
                  ? <span className="patient-record-status-chip">{patient.status.label}</span>
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <footer className="patient-record-drawer-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Keep reviewing</button>
          <button type="button" className="btn btn-primary" onClick={onLoad}>
            <I.Check size={13} /> Load this patient
          </button>
        </footer>
      </aside>
    </div>
  );
}

export function Step2Review({ patient, onUpdate, onNext, onPrev, onPushToast, gate, onSendIntake, allPatients = [], onSelectPatient }) {
  const t = useLang();
  const lockedFields = patient.identity?.lockedFields || [];
  const isLocked = (field) => lockedFields.includes(field);
  const collisionCandidates = useMemo(() => findPatientCollisionCandidates(patient, allPatients), [patient, allPatients]);
  const acked = patient.collisionAcked || [];
  const liveCollisions = collisionCandidates.filter(c => !acked.includes(c.patient.id));
  const [drawerPatientId, setDrawerPatientId] = useState(null);
  const drawerPatient = drawerPatientId ? allPatients.find(p => p.id === drawerPatientId) : null;
  const handleAckCollision = (collisionToAck, pin) => {
    const next = commitCollisionOverride(patient, collisionToAck, pin);
    if (!next) return false;
    onUpdate(next);
    return true;
  };

  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [otpStep, setOtpStep] = useState(patient.otpVerified ? "verified" : "idle"); // idle | sending | sent | verified
  const [otpCode, setOtpCode] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [tgPanel, setTgPanel] = useState(patient.telegramVerified ? "verified" : "idle"); // idle | qr | verified
  const [errors, setErrors] = useState({});
  const tgTimerRef = useRef(null);

  const update = (key, val) => onUpdate({
    ...patient,
    [key]: val,
    ...(COLLISION_FIELDS.has(key) ? { collisionAcked: [] } : {}),
  });
  const updateAddr = (key, val) => onUpdate({ ...patient, address: { ...(patient.address || {}), [key]: val } });

  // OTP timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  const handleSendOtp = () => {
    setOtpStep("sending");
    setTimeout(() => {
      setOtpStep("sent");
      setOtpCountdown(30);
      onPushToast?.("OTP sent to " + (patient.countryCode || "+855") + " " + patient.phoneNumber);
    }, 800);
  };

  const handleVerifyOtp = () => {
    if (otpCode.length !== 6) return;
    setOtpStep("verified");
    onUpdate({ ...patient, otpVerified: true, mobileVerifiedVia: "sms" });
    onPushToast?.("Mobile verified", "success");
  };

  const handleResetMobile = () => {
    setOtpStep("idle");
    setOtpCode("");
    onUpdate({ ...patient, otpVerified: false, mobileVerifiedVia: null });
  };

  const handleTgQr = () => {
    if (tgTimerRef.current) clearTimeout(tgTimerRef.current);
    setTgPanel("qr");
    // mock: auto-verify after 2.5s
    tgTimerRef.current = setTimeout(() => {
      setTgPanel("verified");
      tgTimerRef.current = null;
      onUpdate({
        ...patient,
        telegramVerified: true,
        telegramHandle: patient.telegramHandle || "t.me/" + (patient.name || "patient").toLowerCase().replace(/\s+/g, ""),
        commMethod: patient.commMethod || "telegram",
      });
      onPushToast?.("Telegram verified", "success");
    }, 2500);
  };
  const handleTgCancel = () => {
    if (tgTimerRef.current) {
      clearTimeout(tgTimerRef.current);
      tgTimerRef.current = null;
    }
    setTgPanel("idle");
  };

  const handleTgReset = () => {
    handleTgCancel();
    onUpdate({ ...patient, telegramVerified: false, telegramHandle: "" });
  };

  useEffect(() => () => {
    if (tgTimerRef.current) clearTimeout(tgTimerRef.current);
  }, []);

  const handleUnlock = () => {
    setUnlockConfirmOpen(false);
    onUpdate({
      ...patient,
      identity: { ...(patient.identity || {}), lockedFields: [] },
    });
    onPushToast?.("Fields unlocked — edits will be logged", "error");
  };

  const handleNext = () => {
    const e = {};
    if (!patient.name) e.name = "Required";
    if (!patient.dob) e.dob = "Required";
    if (!patient.sexAtBirth) e.sex = "Required";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      onPushToast?.("Please complete required fields", "error");
      return;
    }
    if (liveCollisions.length > 0) {
      onPushToast?.("Resolve possible duplicate patient before continuing", "error");
      return;
    }
    onNext();
  };

  const phoneDigits = (patient.phoneNumber || "").replace(/\D/g, "").length;
  const phoneValid = phoneDigits >= 8;
  const tgVerified = !!patient.telegramVerified;
  const otpVerified = !!patient.otpVerified;

  return (
    <StepShell
      title={t("step2.title")}
      subtitle={t("step2.sub")}
      className="step-shell-review"
      right={
        lockedFields.length > 0 && (
          <button type="button" className="btn btn-ghost btn-unlock" onClick={() => setUnlockConfirmOpen(true)}>
            <I.Unlock size={11} /> {t("step2.unlockFields")}
          </button>
        )
      }
    >
      {/* Spec v12 §Step 1 collision detection — multiple signals/candidates surface inline before creation. */}
      {liveCollisions.length > 0 && (
        <div className="collision-stack">
          {liveCollisions.map(c => (
            <CollisionBanner
              key={c.patient.id}
              patient={patient}
              collision={c}
              onView={setDrawerPatientId}
              onDismiss={(collisionToAck, pin) => {
                const accepted = handleAckCollision(collisionToAck, pin);
                if (accepted) onPushToast?.(`Override accepted · supervisor PIN logged`, "success");
                return accepted;
              }}
            />
          ))}
        </div>
      )}

      {/* Unlock confirm — v12 requires this at the top of the Identity section. */}
      {unlockConfirmOpen && (
        <div className="unlock-confirm unlock-confirm-top">
          <I.AlertTriangle size={12} className="unlock-confirm-ico" />
          <div className="unlock-confirm-body">
            <div className="unlock-confirm-title">{t("step2.unlock.title")}</div>
            <div className="unlock-confirm-sub">{t("step2.unlock.sub")}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUnlockConfirmOpen(false)}>
            {t("step2.unlock.cancel")}
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleUnlock}>
            {t("step2.unlock.confirm")}
          </button>
        </div>
      )}

      {/* Identity group */}
      <section className="card-soft">
        <div className="group-head">
          <h3 className="group-title">{t("step2.identity")}</h3>
          {patient.identity?.source && (
            <span className="group-source">
              <I.ShieldCheck size={10} /> {t("step2.from." + patient.identity.source)}
            </span>
          )}
        </div>
        <div className="form-grid form-grid-3">
          <div className="field">
            <label className="label">{t("step2.fullNameLatin")} <span className="req">*</span></label>
            <ClearableInput
              type="text"
              className={errors.name ? "invalid" : ""}
              value={patient.name || ""}
              onChange={v => update("name", v)}
              placeholder={t("step2.fullNameLatin.ph")}
              locked={isLocked("name")}
            />
            {errors.name && <div className="help error">{errors.name}</div>}
          </div>
          <div className="field">
            <label className="label">{t("step2.fullNameKhmer")}</label>
            <ClearableInput
              type="text"
              value={patient.nameKhmer || ""}
              onChange={v => update("nameKhmer", v)}
              placeholder="សុខ ស្រីម៉ៅ"
              locked={isLocked("nameKhmer")}
            />
          </div>
          <div className="field">
            <label className="label">{t("step2.dob")} <span className="req">*</span></label>
            <MaskedDob
              value={patient.dob}
              onChange={(iso) => update("dob", iso)}
              locked={isLocked("dob")}
              error={!!errors.dob}
            />
            {errors.dob && <div className="help error">{errors.dob}</div>}
          </div>
          <div className="field">
            <label className="label">{t("step2.sexAtBirth")} <span className="req">*</span></label>
            <select
              className={"select" + (errors.sex ? " invalid" : "") + (isLocked("sexAtBirth") ? " is-locked" : "")}
              value={patient.sexAtBirth || ""}
              onChange={e => update("sexAtBirth", e.target.value)}
              disabled={isLocked("sexAtBirth")}
            >
              <option value="">{t("step2.sex.select")}</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
            {errors.sex && <div className="help error">{errors.sex}</div>}
          </div>
          <div className="field">
            <label className="label">{t("step2.idNumber")}</label>
            <ClearableInput
              type="text"
              value={patient.idNumber || ""}
              onChange={v => update("idNumber", v)}
              locked={isLocked("idNumber")}
            />
          </div>
          <div className="field">
            <label className="label">{t("step2.language")}</label>
            <select
              className="select"
              value={patient.language || "Khmer"}
              onChange={e => update("language", e.target.value)}
            >
              <option>Khmer</option>
              <option>English</option>
              <option>Vietnamese</option>
              <option>Thai</option>
              <option>French</option>
            </select>
          </div>
        </div>
      </section>

      {/* Contact channels */}
      <section className="card-soft">
        <div className="group-head">
          <h3 className="group-title">{t("step2.contactChannels")}</h3>
          <span className="group-hint">{t("step2.contactHint")}</span>
        </div>

        {/* Compact verified rows — same as before */}
        {(tgVerified || otpVerified) && (
          <div className="contact-verified-stack">
            {tgVerified && (
              <div className="contact-verified-row">
                <span className="contact-card-ico" style={{ color: "#229ed9" }}><I.Send size={13} /></span>
                <span className="contact-verified-name">Telegram</span>
                <span className="contact-verified-sep">·</span>
                <span className="contact-card-handle">{patient.telegramHandle || "—"}</span>
                <span className="contact-card-badge"><I.Check size={9} strokeWidth={3} /> {t("step2.verified")}</span>
                {patient.phoneNumber && (
                  <span className="contact-verified-meta">📱 {(patient.countryCode || "+855")} {patient.phoneNumber} · via Telegram</span>
                )}
                <button type="button" className="link-btn contact-verified-action" onClick={handleTgReset}>
                  {t("step2.changeHandle")}
                </button>
              </div>
            )}
            {otpVerified && (
              <div className="contact-verified-row">
                <span className="contact-card-ico" style={{ color: "#268cff" }}><I.MessageSquare size={13} /></span>
                <span className="contact-verified-name">SMS / Mobile</span>
                <span className="contact-verified-sep">·</span>
                <span className="contact-card-handle">
                  {(patient.countryCode || "+855")} {patient.phoneNumber || "—"}
                </span>
                <span className="contact-card-badge"><I.Check size={9} strokeWidth={3} /> {t("step2.verified")}</span>
                <button type="button" className="link-btn contact-verified-action" onClick={handleResetMobile}>
                  <I.Edit size={10} /> {t("step2.editToReverify")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Spec v12 §2 — choose-channel-first model */}
        {(!tgVerified && !otpVerified) && (
          <ChannelChooser
            patient={patient}
            update={update}
            phoneValid={phoneValid}
            otpStep={otpStep}
            setOtpStep={setOtpStep}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            otpCountdown={otpCountdown}
            tgPanel={tgPanel}
            setTgPanel={setTgPanel}
            handleSendOtp={handleSendOtp}
            handleVerifyOtp={handleVerifyOtp}
            handleTgQr={handleTgQr}
            handleTgCancel={handleTgCancel}
            t={t}
          />
        )}

        {/* If only one verified, show the other channel as an optional add-on */}
        {(tgVerified !== otpVerified) && (
          <div className="contact-add-other">
            <span className="contact-add-other-label">Add a second channel?</span>
            {!tgVerified && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleTgQr}>
                <I.Send size={11} /> Add Telegram
              </button>
            )}
            {!otpVerified && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleSendOtp} disabled={!phoneValid}>
                <I.MessageSquare size={11} /> Add SMS verification
              </button>
            )}
          </div>
        )}

        {/* Spec v12 §Step 2 — Patient KHQR for refunds (optional) */}
        <PatientKhqrCapture patient={patient} onUpdate={onUpdate} onPushToast={onPushToast} t={t} />

        {/* Preferred channel */}
        {(tgVerified || otpVerified) && (
          <div className="comm-preferred">
            <span className="comm-preferred-label">{t("step2.preferredComm")}</span>
            <div className="seg">
              <button
                type="button"
                className={"seg-btn" + (patient.commMethod === "telegram" ? " is-on" : "")}
                onClick={() => update("commMethod", "telegram")}
                disabled={!tgVerified}
              >
                <I.Send size={10} /> Telegram
              </button>
              <button
                type="button"
                className={"seg-btn" + (patient.commMethod === "sms" ? " is-on" : "")}
                onClick={() => update("commMethod", "sms")}
                disabled={!otpVerified}
              >
                <I.MessageSquare size={10} /> SMS
              </button>
            </div>
          </div>
      )}
      </section>

      {/* Address (collapsed by default) — placed above Visit Details per v12. */}
      <section className="card-soft">
        <button type="button" className="addr-toggle" onClick={() => setAddrOpen(o => !o)}>
          <I.Home size={12} />
          <span className="addr-toggle-title">{t("step2.address")}</span>
          <span className="addr-toggle-hint">{t("step2.address.optional")}</span>
          <I.ChevronDown size={11} className={"addr-toggle-chev" + (addrOpen ? " open" : "")} />
        </button>
        {addrOpen && (
          <div className="addr-body">
            <div className="addr-help">{t("step2.address.help")}</div>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label className="label">{t("step2.address.province")}</label>
                <select className="select" value={patient.address?.province || ""} onChange={e => updateAddr("province", e.target.value)}>
                  <option value="">Select province / city</option>
                  <option>Phnom Penh</option>
                  <option>Kandal</option>
                  <option>Siem Reap</option>
                  <option>Battambang</option>
                  <option>Kampong Cham</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("step2.address.district")}</label>
                <select className="select" value={patient.address?.district || ""} onChange={e => updateAddr("district", e.target.value)} disabled={!patient.address?.province}>
                  <option value="">Select district / khan</option>
                  <option>Chamkar Mon</option>
                  <option>Daun Penh</option>
                  <option>Toul Kork</option>
                  <option>Mean Chey</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("step2.address.commune")}</label>
                <select className="select" value={patient.address?.commune || ""} onChange={e => updateAddr("commune", e.target.value)} disabled={!patient.address?.district}>
                  <option value="">Select commune / sangkat</option>
                  <option>Boeung Keng Kang</option>
                  <option>Tonle Bassac</option>
                  <option>Phsar Thmei</option>
                  <option>Tuol Sangke</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("step2.address.village")}</label>
                <input className="input" value={patient.address?.village || ""} onChange={e => updateAddr("village", e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label className="label">{t("step2.address.street")}</label>
                <input className="input" value={patient.address?.street || ""} onChange={e => updateAddr("street", e.target.value)} placeholder="House #, street name" />
                {(patient.cart?.items || []).some(i => i.kind === "delivery") && !patient.address?.street && (
                  <div className="help warn"><I.AlertTriangle size={10} /> Delivery address incomplete.</div>
                )}
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label className="label">{t("step2.address.notes")}</label>
                <textarea
                  className="input"
                  value={patient.address?.notes || ""}
                  onChange={e => updateAddr("notes", e.target.value)}
                  placeholder={t("step2.address.notes.ph")}
                  rows={2}
                  style={{ resize: "vertical", fontFamily: "inherit", padding: "8px 12px" }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Visit details — clinical intake the patient owns
         (or that staff can fill on behalf when the patient can't). */}
      <Step2VisitDetails
        patient={patient}
        onUpdate={onUpdate}
        onSendIntake={onSendIntake}
        onPushToast={onPushToast}
        channelReady={tgVerified || otpVerified}
      />

      <StepFooter
        onPrev={onPrev}
        onNext={handleNext}
        nextDisabled={!gate.step2Done || liveCollisions.length > 0}
        blockers={liveCollisions.length > 0 ? ["Resolve possible duplicate patient"] : gate.blockers[2]}
      />
      <PatientRecordDrawer
        patient={drawerPatient}
        open={!!drawerPatient}
        onClose={() => setDrawerPatientId(null)}
        onLoad={() => {
          if (!drawerPatient) return;
          onSelectPatient?.(drawerPatient.id);
          setDrawerPatientId(null);
        }}
      />
    </StepShell>
  );
}

// =====================================================================
// STEP 3 — Insurance
// =====================================================================
export function Step3Insurance({ patient, onUpdate, onNext, onPrev, onPushToast, gate }) {
  const t = useLang();
  const policies = patient.insurance || [];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ provider: "", policyNumber: "", memberName: patient.name || "", memberId: "", expiry: "", coverage: "Outpatient", cardAttached: false });

  // Spec v12 §Step 3 — eligibility check.
  // Mock async flow: policy ID ending in "0" → ineligible, ending in "9" →
  // timeout/unreachable, everything else → eligible. Check fires automatically
  // after Add Policy; result stored on the saved policy record.
  const [eligibility, setEligibility] = useState(null); // { state: "checking"|"eligible"|"ineligible"|"unreachable", details? }
  const [pendingPolicy, setPendingPolicy] = useState(null);
  const checkTimer = useRef(null);

  const startEligibilityCheck = (policy) => {
    setEligibility({ state: "checking" });
    setPendingPolicy(policy);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => {
      const last = (policy.policyNumber || "0").trim().slice(-1);
      if (last === "9") {
        setEligibility({ state: "unreachable" });
      } else if (last === "0") {
        setEligibility({ state: "ineligible", message: "Policy not found or expired." });
      } else {
        setEligibility({
          state: "eligible",
          details: {
            tier: "Outpatient",
            activeUntil: policy.expiry || "Dec 2026",
            coveragePct: 80,
            copay: 5,
          },
        });
      }
    }, 1600);
  };
  const cancelCheck = () => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    setEligibility(null);
    setPendingPolicy(null);
  };
  const acceptEligibility = () => {
    if (!pendingPolicy) return;
    const enriched = { ...pendingPolicy, eligibility };
    onUpdate({ ...patient, insurance: [...policies, enriched], insuranceAcked: true });
    setEligibility(null);
    setPendingPolicy(null);
    setAdding(false);
    setDraft({ provider: "", policyNumber: "", memberName: patient.name || "", memberId: "", expiry: "", coverage: "Outpatient", cardAttached: false });
    if (eligibility.state === "eligible") {
      onPushToast?.(`${enriched.provider} eligible · ${eligibility.details.coveragePct}% coverage`, "success");
    } else if (eligibility.state === "unreachable") {
      onPushToast?.(`${enriched.provider} added · eligibility pending`, "info");
    } else {
      onPushToast?.(`${enriched.provider} added but ineligible — check details`, "error");
    }
  };

  const handleAddPolicy = () => {
    if (!draft.provider || !draft.policyNumber) {
      onPushToast?.("Provider and policy number required", "error");
      return;
    }
    const newP = { id: "ins-" + Date.now(), ...draft };
    startEligibilityCheck(newP);
  };

  const handleRemovePolicy = (id) => {
    onUpdate({ ...patient, insurance: policies.filter(p => p.id !== id) });
    onPushToast?.("Policy removed", "error");
  };

  const handleAttachPolicyCard = (id) => {
    onUpdate({
      ...patient,
      insurance: policies.map(p => p.id === id ? { ...p, cardAttached: true } : p),
      documents: { ...(patient.documents || {}), insurance: "ok" },
    });
    onPushToast?.("Insurance card attached", "success");
  };

  const handleNoInsurance = () => {
    const next = { ...patient, insuranceAcked: true };
    onUpdate(next);
    onPushToast?.("Marked as direct pay");
    onNext?.(next);
  };

  const handleScanCard = () => {
    onPushToast?.("Card scan simulated — autofilled");
    setAdding(true);
    setDraft({
      provider: INSURANCE_PROVIDERS[0],
      policyNumber: "FT-" + Math.floor(Math.random() * 100000000).toString().padStart(8, "0"),
      memberName: patient.name || "",
      memberId: "M-" + Math.floor(Math.random() * 10000000).toString(),
      expiry: "12/2027",
      coverage: "Outpatient",
      cardAttached: true,
    });
  };

  const handleUndoDirect = () => {
    onUpdate({ ...patient, insuranceAcked: false });
  };

  return (
    <StepShell title={t("step3.title")} subtitle={t("step3.sub")}>
      {policies.length === 0 && !adding && patient.insuranceAcked ? (
        <section className="card-soft step3-direct">
          <div className="step3-direct-ico">
            <img className="step3-direct-icon-img" src={directPayCheckIcon} alt="" aria-hidden="true" />
          </div>
          <div className="step3-direct-text">
            <div className="step3-direct-title">{t("step3.direct.title")}</div>
            <div className="step3-direct-sub">{t("step3.directPay")}</div>
          </div>
          <button type="button" className="step3-direct-undo" onClick={handleUndoDirect}>
            <I.Plus size={11} strokeWidth={2.5} />
            <span>{t("step3.direct.undo")}</span>
          </button>
        </section>
      ) : policies.length === 0 && !adding ? (
        <section
          className="card-soft step3-empty next-action-target"
          data-next-action="insurance"
          tabIndex={-1}
          aria-label="Choose insurance option"
        >
          <div className="step3-empty-ico">
            <img className="step3-empty-icon-img" src={insuranceEmptyStateIcon} alt="" aria-hidden="true" />
          </div>
          <div className="step3-empty-title">{t("step3.empty.title")}</div>
          <div className="step3-empty-sub">{t("step3.empty.sub")}</div>
          <div className="step3-empty-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)}>
              <I.Plus size={12} /> {t("step3.add")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleScanCard}>
              <I.Camera size={12} /> {t("step3.scanCard")}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleNoInsurance}>
              {t("step3.noInsurance")} <I.ChevronRight size={12} />
            </button>
          </div>
        </section>
      ) : (
        <>
          {policies.map(p => (
            <section key={p.id} className="card-soft policy-card">
              <div className="policy-card-head">
                <div className="policy-card-ico">
                  <img className="policy-card-icon-img" src={insurancePolicyIcon} alt="" aria-hidden="true" />
                </div>
                <div className="policy-card-info">
                  <div className="policy-card-provider">{p.provider}</div>
                  <div className="policy-card-policy mono">{p.policyNumber}</div>
                </div>
                {p.cardAttached ? (
                  <span className="policy-card-status is-attached">
                    <I.CheckCircle size={11} /> {t("step3.cardAttached")}
                  </span>
                ) : (
                  <button type="button" className="policy-card-status is-missing" onClick={() => handleAttachPolicyCard(p.id)}>
                    <I.Camera size={11} /> {t("step3.attachCard")}
                  </button>
                )}
                <button type="button" className="icon-btn" onClick={() => handleRemovePolicy(p.id)}>
                  <I.Trash size={12} />
                </button>
              </div>
              <div className="policy-card-grid">
                <div><span className="lab">{t("step3.member")}</span><span className="val">{p.memberName || "—"}</span></div>
                <div><span className="lab">{t("step3.memberId")}</span><span className="val mono">{p.memberId || "—"}</span></div>
                <div><span className="lab">{t("step3.expiry")}</span><span className="val mono">{p.expiry || "—"}</span></div>
                <div><span className="lab">{t("step3.coverage")}</span><span className="val">{p.coverage}</span></div>
              </div>
            </section>
          ))}

          {adding && (
            <section
              className="card-soft next-action-target"
              data-next-action="insurance"
              tabIndex={-1}
              aria-label="Add insurance policy"
            >
              <div className="group-head">
                <h3 className="group-title">{t("step3.newPolicy")}</h3>
              </div>
              <div className="form-grid form-grid-2">
                <div className="field">
                  <label className="label">{t("step3.provider")} <span className="req">*</span></label>
                  <select className="select" value={draft.provider} onChange={e => setDraft({ ...draft, provider: e.target.value })}>
                    <option value="">{t("step3.provider.select")}</option>
                    {INSURANCE_PROVIDERS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">{t("step3.policyNumber")} <span className="req">*</span></label>
                  <input className="input" value={draft.policyNumber} onChange={e => setDraft({ ...draft, policyNumber: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">{t("step3.member")}</label>
                  <input className="input" value={draft.memberName} onChange={e => setDraft({ ...draft, memberName: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">{t("step3.memberId")}</label>
                  <input className="input" value={draft.memberId} onChange={e => setDraft({ ...draft, memberId: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label">{t("step3.expiry")}</label>
                  <DateInput value={draft.expiry} onChange={(v) => setDraft({ ...draft, expiry: v })} format="MM/YYYY" />
                </div>
                <div className="field">
                  <label className="label">{t("step3.coverage")}</label>
                  <select className="select" value={draft.coverage} onChange={e => setDraft({ ...draft, coverage: e.target.value })}>
                    <option>Outpatient</option>
                    <option>Inpatient</option>
                    <option>Both</option>
                  </select>
                </div>
              </div>
              <div className="step3-add-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>{t("step3.cancel")}</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddPolicy} disabled={eligibility?.state === "checking"}>
                  <I.Plus size={11} /> {t("step3.savePolicy")}
                </button>
              </div>

              {/* Spec v12 §Step 3 — eligibility check states */}
              {eligibility && (
                <div className={"elig-card elig-" + eligibility.state}>
                  {eligibility.state === "checking" && (
                    <>
                      <div className="elig-spinner" aria-hidden="true" />
                      <div className="elig-body">
                        <strong>Checking eligibility with {pendingPolicy?.provider}…</strong>
                        <p>This usually takes a few seconds.</p>
                      </div>
                      <button type="button" className="link-btn" onClick={cancelCheck}>Cancel</button>
                    </>
                  )}
                  {eligibility.state === "eligible" && (
                    <>
                      <I.CheckCircle size={18} />
                      <div className="elig-body">
                        <strong>Eligible — {pendingPolicy?.provider}</strong>
                        <p>Policy #{pendingPolicy?.policyNumber} · {eligibility.details.tier} · Active until {eligibility.details.activeUntil}</p>
                        <p>Coverage: {eligibility.details.coveragePct}% of eligible services · Co-pay ${eligibility.details.copay} per visit</p>
                      </div>
                      <button type="button" className="btn btn-primary btn-sm" onClick={acceptEligibility}>Save policy</button>
                    </>
                  )}
                  {eligibility.state === "ineligible" && (
                    <>
                      <I.XCircle size={18} />
                      <div className="elig-body">
                        <strong>Not eligible — {pendingPolicy?.provider}</strong>
                        <p>{eligibility.message} Check policy number and expiry, or contact insurer directly.</p>
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEligibilityCheck(pendingPolicy)}>
                        <I.RefreshCw size={11} /> Retry
                      </button>
                      <button type="button" className="link-btn" onClick={cancelCheck}>Cancel</button>
                    </>
                  )}
                  {eligibility.state === "unreachable" && (
                    <>
                      <I.AlertTriangle size={18} />
                      <div className="elig-body">
                        <strong>Unable to verify — insurer API unavailable</strong>
                        <p>You can still add the policy manually. Eligibility will need to be confirmed with the insurer.</p>
                      </div>
                      <button type="button" className="btn btn-primary btn-sm" onClick={acceptEligibility}>Add anyway</button>
                      <button type="button" className="link-btn" onClick={cancelCheck}>Cancel</button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {!adding && policies.length > 0 && (
            <button type="button" className="btn btn-ghost step3-add-more" onClick={() => setAdding(true)}>
              <I.Plus size={12} /> {t("step3.addAnother")}
            </button>
          )}
        </>
      )}

      <StepFooter
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled={!gate.step3Done}
        blockers={gate.blockers[3]}
      />
    </StepShell>
  );
}

// =====================================================================
// STEP 4 — AI Orders
// =====================================================================
export function Step4Orders({ patient, onUpdate, onNext, onPrev, onPushToast, gate, requestPaidEdit }) {
  const t = useLang();
  const cart = patient.cart || { items: [], promos: {}, splits: null, ccy: "USD", payment: { method: null, status: "idle", tendered: "" } };
  const inCartIds = useMemo(() => new Set(cart.items.map(i => i.id)), [cart.items]);

  // The unified AddTestsPanel calls onAdd with [{ testId, name, price, kind }, …].
  // We normalize to cart-item shape and merge with current cart, deduping in-cart ids.
  const addBulk = (items, meta = {}) => {
    const fresh = items.filter(i => !inCartIds.has(i.testId || i.id));
    if (fresh.length === 0) {
      onPushToast?.("Already in cart", "error");
      return;
    }
    const additions = fresh.map(item => {
      const id = item.testId || item.id;
      const c = ORDER_CATALOG.find(c => c.id === id) || {};
      return {
        id, kind: item.kind || c.kind || "lab", name: item.name || c.name,
        price: item.price ?? c.price, qty: 1, payer: patient.payer || "direct", status: "pending",
      };
    });
    const apply = (mode) => {
      const consumedBookingCodes = meta.bookingCode
        ? Array.from(new Set([...(patient.consumedBookingCodes || []), meta.bookingCode]))
        : patient.consumedBookingCodes;
      onUpdate({
        ...patient,
        ...(meta.bookingCode ? { consumedBookingCodes } : {}),
        cart: {
          ...cart,
          items: [...cart.items, ...additions],
          payment: paymentAfterPaidEdit(cart.payment, mode),
        },
      });
      return additions.map(item => item.id);
    };
    if (cart.payment?.status === "confirmed" && requestPaidEdit) {
      requestPaidEdit(`Add ${fresh.length} order${fresh.length === 1 ? "" : "s"} to a paid visit?`, apply);
      return { deferred: true };
    } else {
      const addedIds = apply("normal");
      return {
        ids: addedIds,
        undo: () => onUpdate({
          ...patient,
          cart: {
            ...cart,
            items: (cart.items || []).filter(item => !addedIds.includes(item.id)),
          },
          ...(meta.bookingCode
            ? { consumedBookingCodes: (patient.consumedBookingCodes || []).filter(code => code !== meta.bookingCode) }
            : {}),
        }),
      };
    }
  };

  const removeFromCart = (itemId) => {
    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;
    const apply = (mode) => {
      onUpdate({
        ...patient,
        cart: {
          ...cart,
          items: cart.items.filter(i => i.id !== itemId),
          payment: paymentAfterPaidEdit(cart.payment, mode),
        },
      });
    };
    if (cart.payment?.status === "confirmed" && requestPaidEdit) {
      requestPaidEdit(`Remove ${item.name} from a paid visit?`, apply);
      return { deferred: true };
    }
    apply("normal");
    return {
      undo: () => onUpdate({
        ...patient,
        cart: {
          ...cart,
          items: [...cart.items, item],
        },
      }),
    };
  };

  return (
    <StepShell title={t("step4.title")} subtitle={t("step4.sub")} className="step-shell-orders">

      {/* Unified test picker — replaces AI suggestions + catalogue + previous-tests.
         Currency toggle is shared with the cart rail via patient.cart.ccy. */}
      <AddTestsPanel
        patient={patient}
        onAdd={addBulk}
        onRemove={removeFromCart}
        onPushToast={onPushToast}
        ccy={cart.ccy || "USD"}
        onCcyToggle={(next) => {
          const apply = (mode) => onUpdate({
            ...patient,
            cart: {
              ...cart,
              ccy: next,
              payment: paymentAfterPaidEdit(cart.payment, mode),
            },
          });
          if (cart.payment?.status === "confirmed" && requestPaidEdit) {
            requestPaidEdit(`Change receipt currency to ${next} on a paid visit?`, apply);
          } else {
            apply("normal");
          }
        }}
      />
      <StepFooter
        onPrev={onPrev}
        onNext={onNext}
        nextDisabled={!gate?.step4Done}
        blockers={gate?.blockers?.[4] || []}
        className="step-footer-orders"
      />
    </StepShell>
  );
}

// =====================================================================
// STEP 5 — Teleconsult booking
// =====================================================================
//   Spec v12 §Step 5: separate step for booking a teleconsult.
//   Phase 1 ships the existing 2x2 day-grouped slot picker as a step body;
//   Phase 3 will swap it for a full month calendar.
//
// === Spec v12 §5 — full calendar UI =====================================
//   Replaces the 2x2 slot grid with a single calendar view + day-time pane.
//   Days before the cart's TAT estimate are amber-tinted (results not ready);
//   the first post-TAT day is pre-selected, with its first viable slot
//   highlighted. A specialty selector sits above (auto-mapped from ordered
//   tests, nurse can override).
const SPECIALTIES = [
  { id: "general",      label: "General Practice" },
  { id: "endocrinology",label: "Endocrinology" },
  { id: "cardiology",   label: "Cardiology" },
  { id: "internal",     label: "Internal Medicine" },
  { id: "obgyn",        label: "Obstetrics & Gynaecology" },
];
const TEST_SPECIALTY_MAP = {
  hba1c: "endocrinology", glucose: "endocrinology", tsh: "endocrinology",
  amh: "obgyn", "preg-bhcg": "obgyn", "us-pelvis": "obgyn",
  "ecg-12": "cardiology", lipid: "cardiology", troponin: "cardiology",
  cbc: "internal", lft: "internal", kft: "internal",
};
function autoSpecialty(items = []) {
  const counts = {};
  items.forEach(it => {
    const sp = TEST_SPECIALTY_MAP[it.id];
    if (sp) counts[sp] = (counts[sp] || 0) + 1;
  });
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return winner ? winner[0] : "general";
}
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];
function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function makeMonthGrid(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const start = new Date(first);
  // Mon=0..Sun=6
  const offset = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - offset);
  const grid = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      week.push(cell);
    }
    grid.push(week);
  }
  return grid;
}

export function Step5Teleconsult({ patient, onUpdate, onNext, onPrev, onPushToast, gate }) {
  const t = useLang();
  const cart = patient.cart || { items: [] };
  const tele = patient.teleconsult || { status: "notBooked", slot: null };
  const hasLabOrImaging = (cart.items || []).some(i => i.kind === "lab" || i.kind === "imaging");
  const tatPlan = useMemo(() => hasLabOrImaging ? computeTatPlan(cart.items) : null, [cart.items, hasLabOrImaging]);
  const tatHours = tatPlan?.finalResultHours ?? 0;
  const tatLabel = fmtTatHours(tatHours || 0);

  // Auto-detect specialty from ordered tests; nurse can override.
  const detected = useMemo(() => autoSpecialty(cart.items), [cart.items]);
  const [specialty, setSpecialty] = useState(tele.specialty || detected);
  useEffect(() => { if (!tele.booked && !tele.specialty) setSpecialty(detected); }, [detected, tele.booked, tele.specialty]);

  // Earliest day on which TAT will be met. Today + ceil(tatHours/24) days.
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const earliestReadyDay = useMemo(() => {
    const d = new Date(today);
    const days = Math.max(1, Math.ceil(tatHours / 24));
    d.setDate(d.getDate() + days);
    return d;
  }, [today, tatHours]);

  const [viewMonth, setViewMonth] = useState(() => {
    const d = tele.slot?.date ? new Date(tele.slot.date) : earliestReadyDay;
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    if (tele.slot?.date) return tele.slot.date;
    return dayKey(earliestReadyDay);
  });
  const [pickedTime, setPickedTime] = useState(tele.slot?.time || TIME_SLOTS.find(t => parseInt(t) >= 14) || TIME_SLOTS[0]);
  const [overrideEarly, setOverrideEarly] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const isBooked = tele.status === "booked";
  const isWaived = tele.status === "waived" || tele.skipped;
  useEffect(() => { if (!tele.booked) setSelectedDay(dayKey(earliestReadyDay)); }, [earliestReadyDay, tele.booked]);
  useEffect(() => { if (!isBooked) setRescheduling(false); }, [isBooked]);

  const grid = useMemo(() => makeMonthGrid(viewMonth.year, viewMonth.month), [viewMonth]);
  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDay.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDay]);
  const selectedDayBeforeTAT = selectedDate < earliestReadyDay;
  const fullyBookedDay = (d) => d.getDay() === 5 && d.getDate() % 2 === 0;
  const bookedDate = useMemo(() => {
    if (!tele.slot?.date) return null;
    const [y, m, d] = tele.slot.date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [tele.slot?.date]);
  const bookedSlotLabel = tele.slot?.hint || (bookedDate && tele.slot?.time
    ? `${bookedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })} · ${tele.slot.time}`
    : "");
  const bookedSpecialty = SPECIALTIES.find(s => s.id === (tele.specialty || specialty)) || SPECIALTIES.find(s => s.id === specialty);
  const hasBookedSlot = isBooked && !!tele.slot;
  const showPicker = !hasBookedSlot || rescheduling;

  const prevMonth = () => setViewMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setViewMonth(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  const confirmBooking = () => {
    const wasBooked = hasBookedSlot;
    if (selectedDayBeforeTAT && !overrideEarly) {
      const ok = window.confirm("Results may not be ready for this slot. Book anyway?");
      if (!ok) return;
      setOverrideEarly(true);
    }
    const dateLabel = selectedDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
    const slot = { date: selectedDay, time: pickedTime, hint: `${dateLabel} · ${pickedTime}` };
    onUpdate({
      ...patient,
      teleconsult: {
        ...tele,
        status: "booked",
        booked: true,
        skipped: false,
        specialty,
        slot,
        by: "nurse",
        bookedAt: new Date().toISOString(),
      },
    });
    setRescheduling(false);
    onPushToast?.(`${wasBooked ? "Teleconsult rescheduled" : "Teleconsult booked"} · ${slot.hint}`, "success");
  };
  const skip = () => {
    setRescheduling(false);
    onUpdate({
      ...patient,
      teleconsult: { ...tele, status: "waived", booked: false, skipped: true, slot: null },
      cart: {
        ...cart,
        items: (cart.items || []).filter(i => i.kind !== "telecon" && i.id !== "telecon"),
        payment: paymentAfterPaidEdit(cart.payment, "normal"),
      },
    });
    onPushToast?.("Teleconsult skipped");
  };
  const removeBooking = () => {
    setRescheduling(false);
    onUpdate({
      ...patient,
      teleconsult: { ...tele, status: "notBooked", booked: false, skipped: false, slot: null },
    });
    onPushToast?.("Teleconsult booking removed");
  };
  const startReschedule = () => {
    if (tele.slot?.date) setSelectedDay(tele.slot.date);
    if (tele.slot?.time) setPickedTime(tele.slot.time);
    if (tele.specialty) setSpecialty(tele.specialty);
    setRescheduling(true);
  };
  const keepBooking = () => {
    if (tele.slot?.date) setSelectedDay(tele.slot.date);
    if (tele.slot?.time) setPickedTime(tele.slot.time);
    if (tele.specialty) setSpecialty(tele.specialty);
    setRescheduling(false);
  };

  return (
    <StepShell title={t("step5.title") || "Book a teleconsultation"} subtitle={t("step5.sub") || "Schedule a call with a doctor to review results."} className="step-shell-tele">
      <section className="card-soft tele-step-card next-action-target" data-next-action="teleconsult" tabIndex={-1}>
        <div className="tele-step-context">
          <div className="tele-step-context-row">
            <I.Clock size={12} />
            <span>{tatHours > 0
              ? `Estimated results available: ${tatLabel}. First post-TAT slot is highlighted.`
              : "No TAT-bound tests in cart — book any slot."}</span>
          </div>
        </div>

        {hasBookedSlot && !rescheduling && (
          <div className="tele-booked-summary">
            <div className="tele-booked-summary-icon" aria-hidden="true">
              <I.CheckCircle size={18} />
            </div>
            <div className="tele-booked-summary-copy">
              <span className="tele-booked-summary-kicker">{t("step5.booked")}</span>
              <strong>{bookedSlotLabel || t("step5.bookedSlotFallback")}</strong>
              <span>{bookedSpecialty?.label || specialty} · Dr. Sopheap Chan · ~10 min · INCLUDED</span>
              <span>{t("step5.notifyQueued")}</span>
            </div>
            <div className="tele-booked-summary-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={startReschedule}>
                <I.Edit size={11} /> {t("step5.changeTime")}
              </button>
              <button type="button" className="btn btn-danger-ghost btn-sm" onClick={removeBooking}>
                {t("step5.removeBooking")}
              </button>
            </div>
          </div>
        )}

        {showPicker && (
          <>
            {hasBookedSlot && rescheduling && (
              <div className="tele-reschedule-note">
                <I.Edit size={12} />
                <span>{t("step5.rescheduleNote")}</span>
              </div>
            )}

            {/* Specialty selector — auto-matched, nurse can override */}
            <div className="tele-specialty">
              <label htmlFor="tele-spec">Specialty</label>
              <select
                id="tele-spec"
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
              >
                {SPECIALTIES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {specialty === detected && detected !== "general" && (
                <span className="tele-specialty-hint">auto-matched from ordered tests</span>
              )}
            </div>

            {/* Calendar — month view with TAT-aware shading */}
            <div className="tele-calendar">
              <div className="tele-cal-head">
                <button type="button" className="tele-cal-nav" onClick={prevMonth} aria-label="Previous month"><I.ChevronLeft size={14} /></button>
                <strong>{monthLabel}</strong>
                <button type="button" className="tele-cal-nav" onClick={nextMonth} aria-label="Next month"><I.ChevronRight size={14} /></button>
              </div>
              <div className="tele-cal-grid">
                <div className="tele-cal-dow">Mon</div>
                <div className="tele-cal-dow">Tue</div>
                <div className="tele-cal-dow">Wed</div>
                <div className="tele-cal-dow">Thu</div>
                <div className="tele-cal-dow">Fri</div>
                <div className="tele-cal-dow">Sat</div>
                <div className="tele-cal-dow">Sun</div>
                {grid.flat().map((d) => {
                  const inMonth = d.getMonth() === viewMonth.month;
                  const isToday = dayKey(d) === dayKey(today);
                  const isPast = d < today;
                  const isBeforeTat = d < earliestReadyDay;
                  const isFullyBooked = inMonth && fullyBookedDay(d);
                  const isSelected = dayKey(d) === selectedDay;
                  const cls = "tele-cal-day"
                    + (inMonth ? "" : " is-out")
                    + (isPast ? " is-past" : "")
                    + (isFullyBooked ? " is-full" : "")
                    + (isBeforeTat && !isPast ? " is-before-tat" : "")
                    + (isToday ? " is-today" : "")
                    + (isSelected ? " is-selected" : "");
                  return (
                    <button
                      key={dayKey(d)}
                      type="button"
                      className={cls}
                      disabled={isPast || !inMonth || isFullyBooked}
                      onClick={() => setSelectedDay(dayKey(d))}
                      title={isFullyBooked ? "Fully booked" : (isBeforeTat && !isPast ? "Results not ready yet on this date" : "")}
                      aria-current={isToday ? "date" : undefined}
                      aria-pressed={isSelected}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time-slot pane for the selected day */}
            <div className="tele-times">
              <div className="tele-times-head">
                <I.Clock size={12} />
                <strong>{selectedDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}</strong>
                {selectedDayBeforeTAT && (
                  <span className="tele-times-warn"><I.AlertTriangle size={10} /> Results may not be ready</span>
                )}
              </div>
              <div className="tele-times-grid">
                {TIME_SLOTS.map(time => {
                  const active = pickedTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      className={"tele-times-slot" + (active ? " is-active" : "") + (selectedDayBeforeTAT ? " is-before-tat" : "")}
                      onClick={() => setPickedTime(time)}
                    >
                      <span>{time}</span>
                      {selectedDayBeforeTAT && <small>Results not ready yet</small>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tele-step-actions">
              {hasBookedSlot ? (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={keepBooking}>
                    {t("step5.keepCurrent")}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={confirmBooking}>
                    <I.Check size={11} /> {t("step5.saveNewTime")}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={skip}>
                    {t("step5.skip")}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={confirmBooking}>
                    <I.Check size={11} /> {t("step5.confirm")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>

      <p className="tele-step-foot-note">
        <I.Info size={11} /> {t("step5.footNote") || "Slots are based on estimated result availability. We'll notify the patient if the lab is delayed."}
      </p>

      <StepFooter
        onPrev={onPrev}
        onNext={onNext}
        nextLabel={isWaived ? (t("step5.nextSkipped") || "Continue without teleconsult") : undefined}
        nextDisabled={!gate?.step5Done}
        blockers={gate?.blockers?.[5] || []}
        className="step-footer-tele"
      />
    </StepShell>
  );
}

// =====================================================================
// STEP 6 — Payment
// =====================================================================
//   Spec v12 §Step 6: order summary + payment capture.
//   Phase 1 reuses the existing PaymentArea / useCartPayment from OrderCart.jsx
//   so the payment surface stays a single source of truth. Phase 3 layers the
//   spec's split-bill, mixed cash+KHQR, and auto-split-from-coverage on top.
//
export function Step6Payment({ patient, onUpdate, onNext, onPrev, onPushToast, onCheckIn, gate, payerReady }) {
  const t = useLang();
  const pay = useCartPayment(patient, onUpdate, onPushToast);
  const cart = pay.cart;
  const totals = pay.totals;
  const due = paymentDueAmount(cart, totals);
  const isPaid = cart.payment?.status === "confirmed";
  const isWaiting = cart.payment?.status === "waiting";
  const isPayLater = cart.payment?.status === "deferred";
  const isSplitCash = cart.payment?.status === "split-cash";
  const isNoCharge = cart.items.length > 0 && due <= 0;
  const ccy = cart.ccy || "USD";

  // Spec v12 §6 — mixed cash+KHQR on a single invoice.
  // Nurse enters the cash portion; KHQR remainder is auto-calculated.
  // Cash step must confirm before KHQR step unlocks.
  const [splitMode, setSplitMode] = useState(cart.payment?.method === "split");
  const [cashPortion, setCashPortion] = useState(cart.payment?.cashPortion || "");
  const cashNum = parseFloat(cashPortion) || 0;
  const cashUSD = ccy === "KHR" ? cashNum / KHR_RATE : cashNum;
  const khqrRemainder = Math.max(0, due - cashUSD);
  const cashStepDone = cart.payment?.cashConfirmed === true;
  const splitFullyPaid = cart.payment?.status === "confirmed" && cart.payment?.method === "split";

  const enterSplit = () => {
    setSplitMode(true);
    pay.onMethod(null);
  };
  const exitSplit = () => {
    setSplitMode(false);
    setCashPortion("");
  };
  const confirmCashStep = () => {
    if (cashUSD <= 0 || cashUSD >= due) return;
    onUpdate({
      ...patient,
      cart: { ...cart, payment: { ...cart.payment, method: "split", status: "split-cash", cashPortion: cashPortion, cashConfirmed: true } },
    });
    onPushToast?.(`Cash collected · ${ccy === "KHR" ? "៛" + Math.round(cashNum).toLocaleString() : "$" + cashUSD.toFixed(2)}`, "success");
  };
  const confirmKhqrStep = () => {
    onUpdate({
      ...patient,
      cart: { ...cart, payment: { ...cart.payment, status: "confirmed", method: "split", receiptId: "R-" + Math.floor(10000 + Math.random() * 90000) } },
    });
    onPushToast?.("Payment complete — split cash + KHQR", "success");
  };

  const ctaLabel = (isPaid || isPayLater || isNoCharge)
    ? (t("step6.continue") || "Continue to check-in")
    : (t("step6.payLater") || "Pay later — continue");
  const markPayLater = (continueToCheckIn = false) => {
    const next = {
      ...patient,
      cart: { ...cart, payment: { ...cart.payment, status: "deferred", method: null } },
    };
    onUpdate(next);
    onPushToast?.(t("step6.payLaterToast") || "Marked pay-later — collect at exit", "info");
    if (continueToCheckIn) onNext?.(next);
  };
  const handleFooterNext = () => {
    if (isPaid || isPayLater || isNoCharge) {
      onNext?.(patient);
      return;
    }
    markPayLater(true);
  };

  // Spec v12 §4 + §6 — auto-split preview based on coverage labels.
  const insurance = patient.insurance || [];
  const hasInsurance = insurance.length > 0;
  const groupedByPayer = useMemo(() => {
    const out = { direct: [], insurance: [], preauth: [] };
    cart.items.forEach(it => {
      if (!hasInsurance) { out.direct.push(it); return; }
      const { payer, coverage } = coveragePaymentShare(it.id, insurance);
      if (payer === "preauth") out.preauth.push({ ...it, _coverage: coverage });
      else if (payer === "insurance") out.insurance.push({ ...it, _coverage: coverage });
      else out.direct.push({ ...it, _coverage: coverage });
    });
    return out;
  }, [cart.items, hasInsurance, insurance]);
  const hasAutoSplit = hasInsurance && (groupedByPayer.insurance.length > 0 || groupedByPayer.preauth.length > 0);

  return (
    <StepShell
      title={t("step6.title") || "Payment"}
      subtitle={t("step6.sub") || "Collect payment and confirm the order."}
      className="step-shell-payment"
      right={
        <div className="step6-currency-control">
          <div className="atp-ccy" role="group" aria-label="Payment currency">
            {["USD", "KHR"].map(c => (
              <button
                key={c}
                type="button"
                className={"atp-ccy-tab" + (ccy === c ? " is-active" : "")}
                onClick={() => pay.onCcyToggle(c)}
                aria-pressed={ccy === c}
              >
                {c}
              </button>
            ))}
          </div>
          <span>1 USD = 4,100 KHR</span>
        </div>
      }
    >
      <section className="card-soft step6-summary">
        <header className="step6-summary-head">
          <strong>{t("step6.summaryTitle") || "Order summary"}</strong>
          <span className="step6-summary-total">${totals.total.toFixed(2)}</span>
        </header>
        <div className="step6-summary-rows">
          {cart.items.map(it => (
            <div key={it.id} className="step6-summary-row">
              <span className="step6-summary-row-name">{it.name}</span>
              <span className="step6-summary-row-amt">${(it.price || 0).toFixed(2)}</span>
            </div>
          ))}
          {cart.items.length === 0 && (
            <div className="step6-summary-empty">{t("step6.empty") || "Nothing in cart yet — go back to Orders."}</div>
          )}
        </div>
      </section>

      {/* Spec v12 §4 auto-split preview — only when insurance is on file */}
      {hasAutoSplit && !splitMode && !isPaid && (
        <section className="card-soft step6-autosplit">
          <header className="step6-autosplit-head">
            <I.Sparkles size={12} />
            <strong>Auto-split applied based on insurance eligibility</strong>
          </header>
          {groupedByPayer.insurance.length > 0 && (
            <div className="step6-autosplit-group">
              <div className="step6-autosplit-grouphead">
                <span>Invoice -A · {insurance[0]?.provider || "Insurance"}</span>
                <span>${groupedByPayer.insurance.reduce((s, it) => s + (it.price || 0) * ((it._coverage?.percent || 0) / 100), 0).toFixed(2)}</span>
              </div>
              {groupedByPayer.insurance.map(it => (
                <div key={it.id} className="step6-autosplit-row">
                  <span>{it.name}</span>
                  <span>{it._coverage.percent}% covered · patient ${(it.price * (1 - it._coverage.percent / 100)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          {groupedByPayer.direct.length > 0 && (
            <div className="step6-autosplit-group">
              <div className="step6-autosplit-grouphead">
                <span>Invoice -B · Direct Pay</span>
                <span>${groupedByPayer.direct.reduce((s, it) => s + (it.price || 0), 0).toFixed(2)}</span>
              </div>
            </div>
          )}
          {groupedByPayer.preauth.length > 0 && (
            <div className="step6-autosplit-warn">
              <I.AlertTriangle size={11} /> {groupedByPayer.preauth.length} item(s) require pre-auth before claim
            </div>
          )}
        </section>
      )}

      {isNoCharge && !isPaid && !isPayLater && (
        <section className="card-soft step6-nocharge">
          <I.CheckCircle size={16} />
          <div>
            <strong>No payment due</strong>
            <p>This order has a $0 patient balance. Continue to confirm check-in.</p>
          </div>
        </section>
      )}

      {/* Mixed cash+KHQR section, available when cart hasn't been paid */}
      {cart.items.length > 0 && !isPaid && !isWaiting && !isNoCharge && (
        <section className="card-soft step6-split">
          <header className="step6-split-head">
            <strong>Payment method</strong>
            <button
              type="button"
              className={"step6-split-toggle" + (splitMode ? " is-on" : "")}
              onClick={() => splitMode ? exitSplit() : enterSplit()}
            >
              {splitMode ? <><I.X size={11} /> Cancel split</> : <><I.Split size={11} /> Cash + KHQR split</>}
            </button>
          </header>

          {splitMode && (
            <div className="step6-split-body">
              <div className="step6-split-row">
                <label>Cash portion ({ccy})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashPortion}
                  onChange={e => setCashPortion(e.target.value)}
                  disabled={cashStepDone}
                  placeholder={ccy === "KHR" ? "0" : "0.00"}
                />
              </div>
              <div className="step6-split-row">
                <label>KHQR remainder (auto)</label>
                <span className="step6-split-readonly">${khqrRemainder.toFixed(2)}</span>
              </div>

              <div className="step6-split-steps">
                <button
                  type="button"
                  className={"step6-split-step" + (cashStepDone ? " is-done" : "")}
                  onClick={confirmCashStep}
                  disabled={cashUSD <= 0 || cashUSD >= due || cashStepDone}
                >
                  {cashStepDone ? <><I.Check size={12} strokeWidth={3} /> Step 1: Cash collected</> : <><I.CreditCard size={12} /> Step 1: Collect cash</>}
                </button>
                <button
                  type="button"
                  className="step6-split-step"
                  onClick={confirmKhqrStep}
                  disabled={!cashStepDone || splitFullyPaid}
                >
                  {splitFullyPaid ? <><I.Check size={12} strokeWidth={3} /> Step 2: KHQR confirmed</> : <><I.CreditCard size={12} /> Step 2: Show KHQR ${khqrRemainder.toFixed(2)}</>}
                </button>
              </div>
              {cashStepDone && !splitFullyPaid && (
                <div className="step6-khqr-live">
                  <span className="khqr-cfd-live"><span className="khqr-cfd-live-dot" /> Live · Bakong webhook <span className="khqr-cfd-clock">09:58</span></span>
                  <span className="step6-khqr-copy">QR is on the patient display. Auto-confirm will close this invoice; use manual fallback only after verifying Bakong receipt.</span>
                  <div className="step6-khqr-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPushToast?.("KHQR regenerated · 10 min expiry reset", "info")}>
                      <I.RefreshCw size={11} /> Regenerate
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={confirmKhqrStep}>
                      <I.Check size={11} /> Mark received
                    </button>
                  </div>
                </div>
              )}
              {splitFullyPaid && (
                <div className="step6-split-done"><I.CheckCircle size={12} /> Invoice paid in full — split cash + KHQR</div>
              )}
            </div>
          )}
        </section>
      )}

      {cart.items.length > 0 && !splitMode && !isNoCharge && (
        <PaymentArea
          patient={patient}
          onPushToast={onPushToast}
          cart={cart}
          totals={totals}
          tendered={pay.tendered}
          setTendered={pay.setTendered}
          onMethod={pay.onMethod}
          onCcyToggle={pay.onCcyToggle}
          onConfirmCash={pay.onConfirmCash}
          onConfirmKhqr={pay.onConfirmKhqr}
          change={pay.change}
          cashOk={pay.cashOk}
          tenderedNum={pay.tenderedNum}
          itemCount={pay.itemCount}
          t={t}
          paymentReady={due > 0 && payerReady !== false}
          paymentReasons={[]}
        />
      )}

      <StepFooter
        onPrev={onPrev}
        onNext={handleFooterNext}
        nextLabel={ctaLabel}
        nextDisabled={isWaiting || isSplitCash || cart.items.length === 0}
        blockers={
          isWaiting
            ? [t("step6.waitingBlock") || "Waiting for payment to confirm"]
            : isSplitCash
              ? ["Finish split KHQR payment before continuing"]
              : []
        }
        secondary={!isPaid && !isPayLater && !isNoCharge && cart.items.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => markPayLater(false)}>
            <I.Clock size={11} /> {t("step6.markPayLater") || "Mark pay-later"}
          </button>
        )}
        className="step-footer-payment"
      />
    </StepShell>
  );
}
