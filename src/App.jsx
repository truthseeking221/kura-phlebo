// Phlebotomy + Vital Signs portal — root.
// Two booth screens (Vital Signs, Phlebotomy) share a Sidebar+Topbar shell,
// a Scan Gate entry, a Patient Card, and a Queue Drawer fallback. Both
// screens are scanner-first: barcode → load patient → record/collect →
// success toast → return to scan gate.

import { useState, useMemo, useCallback, useEffect } from "react";
import { LangProvider } from "./i18n";
import { ToastStack } from "./Modals";
import { I } from "./icons";
import { PhleboSidebar, PhleboTopbar } from "./PhleboShell";
import { ScanGate } from "./ScanGate";
import { PatientCard } from "./PatientCard";
import { VitalsForm } from "./VitalsForm";
import { PhleboScreen } from "./PhleboScreen";
import { SampleDetailPanel } from "./SampleDetailPanel";
import { QueueDrawer } from "./QueueDrawer";
import { initialQueue, initialNotifications } from "./phleboData";

const DEFAULT_NAV = "vitals";

function PlaceholderScreen({ title, lead }) {
  return (
    <section className="vp-placeholder">
      <div className="vp-placeholder-inner">
        <div className="vp-placeholder-glyph" aria-hidden="true">
          <I.Sparkles size={28} />
        </div>
        <h2>{title}</h2>
        <p>{lead}</p>
        <span className="vp-placeholder-hint">Open <strong>Vital Signs</strong> or <strong>Phlebotomy</strong> from the sidebar to start the booth flow.</span>
      </div>
    </section>
  );
}

export default function App() {
  const [uiLang, setUiLang] = useState("English");
  return (
    <LangProvider lang={uiLang}>
      <AppShell uiLang={uiLang} setUiLang={setUiLang} />
    </LangProvider>
  );
}

function AppShell({ uiLang, setUiLang }) {
  const [collapsed, setCollapsed] = useState(true);
  const [activeNav, setActiveNav] = useState(DEFAULT_NAV);
  const [station, setStation] = useState("PSC-01");
  const [shift, setShift] = useState("morning");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [queue, setQueue] = useState(initialQueue);
  const [notifs, setNotifs] = useState(initialNotifications);
  const [toasts, setToasts] = useState([]);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const [currentPatientId, setCurrentPatientId] = useState(null);
  // Shared between PhleboScreen and SampleDetailPanel — scan a tube barcode
  // or click a tube anywhere → both views snap to the same sample.
  const [focusedSampleId, setFocusedSampleId] = useState(null);

  const pushToast = useCallback((toast) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const closeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const currentPatient = useMemo(
    () => queue.find(p => p.id === currentPatientId) || null,
    [queue, currentPatientId]
  );

  useEffect(() => {
    setCurrentPatientId(null);
    setBrowseOpen(false);
    setFocusedSampleId(null);
  }, [activeNav]);

  useEffect(() => {
    setFocusedSampleId(null);
  }, [currentPatientId]);

  const role = activeNav === "phlebo"
    ? "Phlebotomy"
    : activeNav === "vitals"
      ? "Vital Signs"
      : "Dashboard";

  const handleMatch = (p) => {
    setCurrentPatientId(p.id);
    setBrowseOpen(false);
    pushToast({ tone: "info", text: `Loaded ${p.name} (${p.pid})` });
  };

  const handleVitalsSubmit = (vitals) => {
    if (!currentPatient) return;
    const id = currentPatient.id;
    const stillNeedsPhlebo = currentPatient.journey?.phlebo !== "done";
    const name = currentPatient.name;
    setQueue(q => q.map(p => p.id === id
      ? { ...p, vitals, journey: { ...p.journey, vitals: "done" } }
      : p));
    pushToast({
      tone: "success",
      text: `Vitals saved for ${name}${stillNeedsPhlebo ? " — ready for Phlebotomy" : ""}`,
    });
    setTimeout(() => setCurrentPatientId(null), 1200);
  };

  const handlePhleboUpdate = (samples) => {
    if (!currentPatient) return;
    setQueue(q => q.map(p => p.id === currentPatient.id ? { ...p, samples } : p));
  };

  const handlePhleboSubmit = () => {
    if (!currentPatient) return;
    const name = currentPatient.name;
    setQueue(q => q.map(p => p.id === currentPatient.id
      ? { ...p, journey: { ...p.journey, phlebo: "done" } }
      : p));
    pushToast({ tone: "success", text: `Collection complete for ${name}` });
    setTimeout(() => setCurrentPatientId(null), 1200);
  };

  const handleSaveDraft = () => {
    pushToast({ tone: "info", text: "Draft saved — patient stays in queue" });
    setCurrentPatientId(null);
  };

  const queueCountForRole = useMemo(() => {
    if (role === "Phlebotomy")  return queue.filter(p => p.journey?.phlebo !== "done").length;
    if (role === "Vital Signs") return queue.filter(p => p.journey?.vitals !== "done").length;
    return queue.length;
  }, [queue, role]);

  const queueForRole = useMemo(() => {
    if (role === "Phlebotomy")  return queue.filter(p => p.journey?.phlebo !== "done");
    if (role === "Vital Signs") return queue.filter(p => p.journey?.vitals !== "done");
    return queue;
  }, [queue, role]);

  const handleNavigate = (id) => setActiveNav(id);

  const renderActiveBody = () => {
    if (activeNav === "vitals" || activeNav === "phlebo") {
      if (!currentPatient) {
        return (
          <ScanGate
            role={role}
            queue={queueForRole}
            onMatch={handleMatch}
            onBrowseQueue={() => setBrowseOpen(o => !o)}
            browseOpen={browseOpen}
          />
        );
      }
      const samples = currentPatient.samples || [];
      const focusedSample = samples.find(s => s.id === focusedSampleId) || null;

      const phleboCollect = (id) => {
        const ms = Date.now();
        const at = new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        handlePhleboUpdate(samples.map(s => s.id === id
          ? { ...s, status: "collected", collectedAt: at, collectedAtMs: ms, collectedBy: "Linh Nguyen", inverted: false }
          : s));
        setFocusedSampleId(id);
        pushToast({ tone: "success", text: `Collected ${id}` });
      };
      const phleboReset = (id) => {
        handlePhleboUpdate(samples.map(s => s.id === id
          ? { ...s, status: "generated", collectedAt: undefined, collectedAtMs: undefined, collectedBy: undefined, inverted: false, deferReason: undefined, deferNote: undefined }
          : s));
        pushToast({ tone: "info", text: `Reset ${id}` });
      };
      const phleboMarkInverted = (id) => {
        handlePhleboUpdate(samples.map(s => s.id === id ? { ...s, inverted: true } : s));
        pushToast({ tone: "success", text: `Inversion confirmed for ${id}` });
      };

      return (
        <div className={"vp-workspace" + (activeNav === "phlebo" ? " vp-workspace-phlebo" : "")}>
          <div className="vp-workspace-rail">
            <PatientCard
              patient={currentPatient}
              currentStep={activeNav === "phlebo" ? "phlebo" : "vitals"}
            />
            {activeNav === "phlebo" && (
              <SampleDetailPanel
                sample={focusedSample}
                allSamples={samples}
                onMarkInverted={phleboMarkInverted}
                onCollect={phleboCollect}
                onReset={phleboReset}
                onPickAnother={(id) => setFocusedSampleId(id)}
                onScanFocus={() => {
                  const el = document.querySelector(".vp-st-scan-field input");
                  if (el) {
                    el.focus();
                    el.scrollIntoView({ block: "center", behavior: "smooth" });
                  }
                }}
              />
            )}
          </div>
          <div className="vp-workspace-main">
            {activeNav === "vitals" ? (
              <VitalsForm
                patient={currentPatient}
                initial={currentPatient.vitals}
                onSubmit={handleVitalsSubmit}
                onClear={() => pushToast({ tone: "info", text: "Form cleared" })}
                onCancel={() => setCurrentPatientId(null)}
              />
            ) : (
              <PhleboScreen
                patient={currentPatient}
                samples={samples}
                onUpdateSamples={handlePhleboUpdate}
                onSubmit={handlePhleboSubmit}
                onSaveDraft={handleSaveDraft}
                onPushToast={pushToast}
                focusedSampleId={focusedSampleId}
                onFocusSample={setFocusedSampleId}
              />
            )}
          </div>
        </div>
      );
    }

    const titles = {
      home:     ["Dashboard",         "Booth-level metrics will live here — daily volume, wait times, abnormal-vitals trend."],
      queue:    ["Queue overview",    "Cross-station view of patients in flight. Use the right-side drawer for the active booth's queue."],
      patients: ["Patient directory", "Search by name, PID, or order — patient profile, history, recent visits."],
      reports:  ["Reports",           "Daily, weekly and shift reports — drawn samples, vitals coverage, defer reasons."],
      settings: ["Settings",          "Station preferences, printer config, clinical ranges, language."],
    };
    const [t, l] = titles[activeNav] || ["Section", "Coming soon."];
    return <PlaceholderScreen title={t} lead={l} />;
  };

  return (
    <div className="app">
      <PhleboSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        active={activeNav}
        onNavigate={handleNavigate}
        lang={uiLang}
        onLangChange={setUiLang}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="main">
        <PhleboTopbar
          onMenuClick={() => setMobileNavOpen(true)}
          station={station}
          onStationChange={setStation}
          shift={shift}
          onShiftChange={setShift}
          notifs={notifs}
          onMarkAllRead={() => setNotifs(ns => ns.map(n => ({ ...n, unread: false })))}
          onNotifAction={() => {}}
          onNotifClick={() => {}}
          onUserAction={() => {}}
          station_role={role}
          onBack={currentPatient ? () => setCurrentPatientId(null) : null}
          onToggleQueue={(activeNav === "vitals" || activeNav === "phlebo") ? () => setQueueOpen(o => !o) : null}
          queueCount={queueCountForRole}
        />

        <main className="content vp-content">
          {renderActiveBody()}
        </main>
      </div>

      <QueueDrawer
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        queue={queueForRole}
        role={role}
        onPick={handleMatch}
      />

      <ToastStack toasts={toasts} onClose={closeToast} />
    </div>
  );
}
