// === Kura Reception — Wizard shell, progress bar, patient header ===
//   v3 (spec v12): 6-step wizard
//     Identity → Review → Insurance → Orders → Teleconsult → Payment.
//   The cart rail still owns the final "Check in & confirm order" CTA; payment
//   capture moves out of the cart into Step 6 so the cart can stay focused on
//   the order list + TAT footer.
//   - WizardProgress: numbered stepper with active/done/locked states
//   - PatientHeader: sticky patient identity bar (always visible)
//   - useWizardGate: returns step-by-step completion gates with reasons
//   - STEP_DEFS: canonical step list
//
import React, { useMemo, useState } from "react";
import { I } from "./icons";
import { useLang } from "./i18n";
import { Kbd } from "./shared";

// === Canonical step definitions ===
export const STEP_DEFS = [
  { id: 1, key: "Identity",     icon: "User",        labelKey: "step.identity"    },
  { id: 2, key: "Review",       icon: "FileText",    labelKey: "step.review"      },
  { id: 3, key: "Insurance",    icon: "Shield",      labelKey: "step.insurance"   },
  { id: 4, key: "Orders",       icon: "Sparkles",    labelKey: "step.orders"      },
  { id: 5, key: "Teleconsult",  icon: "Video",       labelKey: "step.teleconsult" },
  { id: 6, key: "Payment",      icon: "CreditCard",  labelKey: "step.payment"     },
];

export function canNavigateToStep(stepId, currentStep, gate) {
  const status = gate.stepStatus?.[stepId];
  if (stepId === currentStep || status === "locked") return false;
  if (status === "done" || stepId < currentStep) return true;
  if (stepId === currentStep + 1) return !!gate["step" + currentStep + "Done"];
  return false;
}

// === useWizardGate: derives completion state for each step ===
//   Returns { stepStatus[1..6], blockers, isReadyToCheckIn }
//
//   Step 1 (Identity)   → has name AND identity captured (any source)
//   Step 2 (Review)     → name + DOB + sexAtBirth + at least one verified contact
//   Step 3 (Insurance)  → has insurance OR explicitly marked "no insurance"
//                         (auto-completes — never blocking)
//   Step 4 (Orders)     → at least one item in cart
//   Step 5 (Teleconsult)→ teleconsult booked OR explicitly skipped
//   Step 6 (Payment)    → payment confirmed (or marked pay-later)
//
//   Cart CTA per spec v12 §Order Cart gates only on identity + items, not on
//   payment — payment can complete in Step 6 before or after check-in.
//   `isReadyToCheckIn` mirrors the cart CTA so dock + cart agree.
//
export function useWizardGate(patient) {
  return useMemo(() => {
    const blockers = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    // Step 1 — identity
    const hasName = !!patient.name;
    const hasIdentitySource = !!(patient.idScanned || patient.manualEntry || patient.identity?.source);
    if (!hasName) blockers[1].push("Name required");
    if (!hasIdentitySource && !hasName) blockers[1].push("Capture identity (scan, NFC, or manual)");
    const step1Done = hasName && hasIdentitySource;

    // Step 2 — review
    const hasDob = !!patient.dob;
    const hasSex = !!patient.sexAtBirth;
    const hasContact = !!(patient.otpVerified || patient.telegramVerified);
    if (!hasName) blockers[2].push("Full name required");
    if (!hasDob) blockers[2].push("Date of birth required");
    if (!hasSex) blockers[2].push("Sex at birth required");
    if (!hasContact) blockers[2].push("At least one verified contact required");
    const step2Done = step1Done && hasName && hasDob && hasSex && hasContact;

    // Step 3 — insurance (always completable; default = no insurance)
    const insuranceAcked = step2Done && (patient.insuranceAcked || (patient.insurance || []).length > 0);
    const step3Done = step2Done && insuranceAcked;

    // Step 4 — orders
    const cart = patient.cart || { items: [] };
    const itemCount = (cart.items || []).length;
    if (itemCount === 0) blockers[4].push("Add at least one service");
    const step4Done = step3Done && itemCount > 0;

    // Step 5 — teleconsult: auto-completes when nurse books or explicitly skips,
    // OR when there's no teleconsult line in the cart (nurse already removed it).
    const tele = patient.teleconsult || {};
    const teleInCart = (cart.items || []).some(i => i.kind === "telecon" || i.id === "telecon");
    const teleResolved = tele.booked || tele.skipped || !teleInCart;
    if (!teleResolved) blockers[5].push("Book or skip teleconsult");
    const step5Done = step4Done && teleResolved;

    // Step 6 — payment confirmed OR explicitly deferred (pay-later)
    const paid = cart.payment?.status === "confirmed";
    const payLater = cart.payment?.status === "deferred";
    if (!paid && !payLater) blockers[6].push("Take payment or mark pay-later");
    const step6Done = step5Done && (paid || payLater);

    const stepStatus = {
      1: step1Done ? "done" : "active",
      2: !step1Done ? "locked" : (step2Done ? "done" : "active"),
      3: !step2Done ? "locked" : (step3Done ? "done" : "active"),
      4: !step3Done ? "locked" : (step4Done ? "done" : "active"),
      5: !step4Done ? "locked" : (step5Done ? "done" : "active"),
      6: !step5Done ? "locked" : (step6Done ? "done" : "active"),
    };

    // Cart CTA gate per spec v12 — strict, no bypass:
    //   ≥1 cart item · name · DOB · sex · ≥1 verified contact.
    // Payment resolution is handled by the final check-in action.
    const cartCtaReady = itemCount > 0 && hasName && hasDob && hasSex && hasContact;

    return {
      stepStatus,
      blockers,
      step1Done, step2Done, step3Done, step4Done, step5Done, step6Done,
      paid, payLater,
      cartCtaReady,
      isReadyToCheckIn: cartCtaReady,
    };
  }, [patient]);
}

// === WizardProgress — desktop stepper + mobile compact summary ===
//   Both render unconditionally; CSS hides one based on the viewport.
//   Desktop  → numbered stepper with full labels (existing layout)
//   Mobile   → "Step n of 4" + step name + 4 dots, fits 360px width
//
export function WizardProgress({ currentStep, gate, onStepClick }) {
  const t = useLang();
  const currentDef = STEP_DEFS.find(s => s.id === currentStep) || STEP_DEFS[0];
  return (
    <>
      <div className="wiz-progress wiz-progress-desktop" role="navigation" aria-label="Check-in progress">
        {STEP_DEFS.map((s, idx) => {
          const status = gate.stepStatus[s.id]; // "done" | "active" | "locked"
          const isCurrent = currentStep === s.id;
          const isNavigable = canNavigateToStep(s.id, currentStep, gate);
          const isClickable = isNavigable || isCurrent;
          const cls = "wiz-step"
            + (isCurrent ? " is-current" : "")
            + (status === "done" ? " is-done" : "")
            + (status === "locked" ? " is-locked" : "")
            + (isClickable ? " is-clickable" : "");
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                className={cls}
                onClick={() => isNavigable && onStepClick?.(s.id)}
                disabled={!isClickable}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${s.id}. ${t(s.labelKey)} — ${status}`}
              >
                <span className="wiz-step-mark">
                  {status === "done" && !isCurrent
                    ? <I.Check size={11} strokeWidth={3} />
                    : <span className="wiz-step-num">{s.id}</span>}
                </span>
                <span className="wiz-step-label">{t(s.labelKey)}</span>
              </button>
              {idx < STEP_DEFS.length - 1 && (
                <span className={"wiz-connector" + (gate.stepStatus[s.id] === "done" ? " is-done" : "")} />
              )}
            </React.Fragment>
          );
        })}
        <span className="wiz-shortcut-hint" title="Switch steps with F1-F6">
          <Kbd>F1-F6</Kbd>
          <span>steps</span>
        </span>
      </div>

      <div className="wiz-progress-mobile" role="navigation" aria-label="Check-in progress">
        <div className="wiz-mobile-copy">
          <span>Step {currentStep} of {STEP_DEFS.length}</span>
          <strong>{t(currentDef.labelKey)}</strong>
        </div>
        <div className="wiz-mobile-dots">
          {STEP_DEFS.map(s => {
            const status = gate.stepStatus[s.id];
            const isCurrent = currentStep === s.id;
            const isNavigable = canNavigateToStep(s.id, currentStep, gate);
            const isClickable = isNavigable || isCurrent;
            const cls = "wiz-mobile-dot"
              + (isCurrent ? " is-current" : "")
              + (status === "done" && !isCurrent ? " is-done" : "")
              + (status === "locked" ? " is-locked" : "");
            return (
              <button
                key={s.id}
                type="button"
                className={cls}
                onClick={() => isNavigable && onStepClick?.(s.id)}
                disabled={!isClickable}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${s.id}. ${t(s.labelKey)}`}
              >
                {status === "done" && !isCurrent
                  ? <I.Check size={11} strokeWidth={3} />
                  : s.id}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// === PatientHeader — sticky identity bar ===
//   Shows: avatar | name + queue + DOB + phone | status chips
//
const AVATAR_COLORS = {
  "av-blue": "#268cff", "av-teal": "#06a07a", "av-purple": "#7a45ec",
  "av-amber": "#d97706", "av-pink": "#e91e8c", "av-green": "#2e7d32",
};

export function PatientHeader({ patient, gate, currentStep = 1, onStepClick, nextAction = null }) {
  const t = useLang();
  const [stepSwitcherOpen, setStepSwitcherOpen] = useState(false);
  const currentDef = STEP_DEFS.find(s => s.id === currentStep) || STEP_DEFS[0];
  const initials = (patient.initials || (patient.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2) || "?").toUpperCase();
  const avatarBg = AVATAR_COLORS[patient.avatarColor] || "#268cff";
  const phoneDisplay = patient.phoneNumber
    ? (patient.countryCode || "+855") + " " + patient.phoneNumber
    : (patient.mobile || "—");
  // DOB: "1996-02-14" → "14 Feb 1996 · 30y"
  // For a busy nurse, "1996 02 14" is harder to parse than the human form.
  const dobDisplay = (() => {
    if (!patient.dob) return null;
    const d = new Date(patient.dob);
    if (Number.isNaN(d.getTime())) return patient.dob;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = d.getDate();
    const mo = months[d.getMonth()];
    const yr = d.getFullYear();
    const today = new Date();
    let age = today.getFullYear() - yr;
    if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < day)) age--;
    return `${day} ${mo} ${yr} · ${age}y`;
  })();

  const stepSwitcherTitle = `Step ${currentStep}/${STEP_DEFS.length} · ${t(currentDef.labelKey)}`;

  const getStepDetail = (step, isCurrent, isNavigable) => {
    const status = gate.stepStatus[step.id];
    if (isCurrent) return "Current";
    if (status === "done") return "Completed";
    if (isNavigable) return "Available";
    return gate.blockers?.[step.id]?.[0] || "Complete prior step first";
  };

  const handleStepSelect = (stepId, isNavigable) => {
    if (!isNavigable) return;
    setStepSwitcherOpen(false);
    onStepClick?.(stepId);
  };
  const guideToNextActionTarget = (selector, delay = 0) => {
    if (!selector || typeof document === "undefined") return;
    window.setTimeout(() => {
      const candidates = Array.from(document.querySelectorAll(selector));
      const target = candidates.find(el => {
        if (!el || el.closest('[aria-hidden="true"], [inert]')) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      }) || candidates[0];
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus?.({ preventScroll: true });
      target.classList.add("is-guided");
      window.setTimeout(() => target.classList.remove("is-guided"), 1100);
    }, delay);
  };

  return (
    <div className={"patient-header" + (stepSwitcherOpen ? " is-step-sheet-open" : "")}>
      <div className="patient-header-id">
        {patient.name ? (
          <div className="patient-header-avatar" style={{ background: avatarBg }}>{initials}</div>
        ) : (
          <div className="patient-header-avatar patient-header-avatar-empty"><I.User size={14} /></div>
        )}
        <div className="patient-header-meta">
          <div className="patient-header-name">{patient.name || t("patient.unidentified")}</div>
          <div className="patient-header-sub">
            {/* Spec v12 §Global Layout: queue badge removed. Identity bar shows
                name · DOB · age · sex (and phone when captured), nothing else. */}
            {dobDisplay && (
              <span className="patient-header-pill"><I.Calendar size={9} /> <span className="patient-header-pill-text">{dobDisplay}</span></span>
            )}
            {patient.sexAtBirth && (
              <span className="patient-header-pill"><I.User size={9} /> <span className="patient-header-pill-text">{patient.sexAtBirth.charAt(0).toUpperCase()}</span></span>
            )}
            {phoneDisplay !== "—" && (
              <span className="patient-header-pill"><I.Phone size={9} /> <span className="patient-header-pill-text">{phoneDisplay}</span></span>
            )}
          </div>
        </div>
      </div>
      {nextAction && (() => {
        const NextIcon = I[nextAction.icon] || I.AlertCircle;
        const targetStatus = nextAction.target ? gate.stepStatus?.[nextAction.target] : null;
        const targetUnlocked = !!nextAction.target && !!targetStatus && targetStatus !== "locked";
        const canJump = targetUnlocked && nextAction.target !== currentStep;
        const canGuide = !!nextAction.selector && targetUnlocked;
        const canConfirmCurrent = targetUnlocked && nextAction.target === currentStep;
        const isActionable = canJump || canGuide || canConfirmCurrent;
        const handleNextAction = () => {
          if (targetUnlocked) {
            onStepClick?.(nextAction.target);
            if (nextAction.selector) {
              guideToNextActionTarget(nextAction.selector, nextAction.target === currentStep ? 0 : 80);
            }
            return;
          }
        };
        return (
          <button
            type="button"
            className={"patient-header-next patient-header-next-" + nextAction.tone + (isActionable ? "" : " is-static")}
            onClick={handleNextAction}
            disabled={!isActionable}
            aria-label={canJump ? `Next: ${nextAction.label}. Jump to step ${nextAction.target}` : nextAction.label}
            title={canJump ? `Jump to step ${nextAction.target}` : canGuide ? "Show required action" : undefined}
          >
            <NextIcon size={12} strokeWidth={2.25} />
            <span>{nextAction.label}</span>
          </button>
        );
      })()}
      <div className="patient-header-mobile-status">
        <button
          type="button"
          className="ph-step-switcher"
          onClick={() => setStepSwitcherOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={stepSwitcherOpen}
          aria-label={`Open check-in steps. ${stepSwitcherTitle}`}
        >
          <span className="ph-step-prefix"><span className="ph-step-prefix-word">Step </span>{currentStep}/{STEP_DEFS.length}</span>
          <strong>{t(currentDef.labelKey)}</strong>
          <I.ChevronDown size={10} strokeWidth={2.4} />
        </button>
        {stepSwitcherOpen && (
          <>
            <button
              type="button"
              className="mobile-step-scrim"
              aria-label="Close check-in steps"
              onClick={() => setStepSwitcherOpen(false)}
            />
            <div className="mobile-step-sheet" role="dialog" aria-modal="true" aria-label="Check-in steps">
              <div className="mobile-step-sheet-head">
                <div>
                  <span>Check-in steps</span>
                  <strong>{stepSwitcherTitle}</strong>
                </div>
                <button type="button" aria-label="Close check-in steps" onClick={() => setStepSwitcherOpen(false)}>
                  <I.X size={15} />
                </button>
              </div>
              <div className="mobile-step-list">
                {STEP_DEFS.map(step => {
                  const status = gate.stepStatus[step.id];
                  const isCurrent = currentStep === step.id;
                  const isNavigable = canNavigateToStep(step.id, currentStep, gate);
                  const StepIcon = I[step.icon] || I.FileText;
                  const rowClass = "mobile-step-row"
                    + (isCurrent ? " is-current" : "")
                    + (status === "done" && !isCurrent ? " is-done" : "")
                    + (!isCurrent && !isNavigable ? " is-locked" : "");
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={rowClass}
                      onClick={() => handleStepSelect(step.id, isNavigable)}
                      disabled={isCurrent || !isNavigable}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span className="mobile-step-mark">
                        {status === "done" && !isCurrent
                          ? <I.Check size={12} strokeWidth={3} />
                          : <StepIcon size={13} strokeWidth={2.2} />}
                      </span>
                      <span className="mobile-step-copy">
                        <strong>{step.id}. {t(step.labelKey)}</strong>
                        <span>{getStepDetail(step, isCurrent, isNavigable)}</span>
                      </span>
                      <span className="mobile-step-action">
                        {isCurrent
                          ? "Now"
                          : status === "done"
                            ? "Edit"
                            : isNavigable
                              ? "Go"
                              : <I.Lock size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
