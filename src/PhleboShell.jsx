// Phlebotomy + Vital Signs portal shell.
// Reuses sidebar/topbar visual primitives from the Kura design system,
// rewires nav for the booth context (Vital Signs / Phlebotomy).

import { useState, useEffect, useRef } from "react";
import { I } from "./icons";
import { useLang } from "./i18n";
import { NotificationsPanel, PillMenu, UserMenu } from "./Notifications";
import { stations, shifts } from "./phleboData";
import kuraLogo from "./assets/kura-logo.svg";

const LANGUAGES = ["Khmer", "English", "Vietnamese", "Thai", "French", "Korean"];

const NAV_PRIMARY = [
  { id: "home",     key: "Dashboard", icon: "Home" },
  { id: "queue",    key: "Queue",     icon: "Users" },
  { id: "patients", key: "Patients",  icon: "User" },
  { id: "reports",  key: "Reports",   icon: "BarChart" },
  { id: "settings", key: "Settings",  icon: "Settings" },
];

const NAV_BOOTH = [
  { id: "vitals",  key: "Vital Signs", icon: "Heart",          accent: true },
  { id: "phlebo",  key: "Phlebotomy",  icon: "FlaskConical",   accent: true },
];

export function PhleboSidebar({ collapsed, onToggle, active, onNavigate, lang, onLangChange, mobileOpen = false, onMobileClose }) {
  const sidebarRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const effectiveCollapsed = collapsed && !isMobile;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const handleNav = (id) => {
    onNavigate(id);
    if (onMobileClose) onMobileClose();
  };

  const renderItem = (it) => {
    const Ico = I[it.icon];
    const isActive = active === it.id;
    return (
      <button
        type="button"
        key={it.id}
        className={"nav-item" + (isActive ? " active" : "") + (it.accent ? " nav-item-accent" : "")}
        onClick={() => handleNav(it.id)}
        title={effectiveCollapsed ? it.key : ""}
        aria-current={isActive ? "page" : undefined}
      >
        <Ico size={18} />
        {!effectiveCollapsed && <span>{it.key}</span>}
      </button>
    );
  };

  const hiddenOnMobile = isMobile && !mobileOpen;

  return (
    <aside
      ref={sidebarRef}
      className={"sidebar" + (effectiveCollapsed ? " collapsed" : "") + (mobileOpen ? " mobile-open" : "")}
      aria-label="Navigation"
      aria-hidden={hiddenOnMobile ? "true" : undefined}
      inert={hiddenOnMobile ? "" : undefined}
    >
      <div className="brand">
        <div className="brand-mark">
          <img className="brand-logo" src={kuraLogo} alt="Kura" />
        </div>
        {!effectiveCollapsed && (
          <div className="brand-text">Kura <span className="sub">Booth</span></div>
        )}
        {isMobile && (
          <button type="button" className="sidebar-mobile-close" onClick={onMobileClose} aria-label="Close navigation">
            <I.X size={18} />
          </button>
        )}
      </div>

      <nav className="nav">
        {NAV_PRIMARY.map(renderItem)}
        <div className="nav-section-divider" aria-hidden="true">
          {!effectiveCollapsed && <span>Station</span>}
        </div>
        {NAV_BOOTH.map(renderItem)}
      </nav>

      <div className="sidebar-lang" title={effectiveCollapsed ? "Language" : ""}>
        <I.Globe size={15} style={{ flexShrink: 0, color: "var(--ink-500)" }} />
        {!effectiveCollapsed && (
          <select
            value={lang}
            onChange={e => onLangChange(e.target.value)}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12.5, fontWeight: 500, color: "var(--ink-700)", cursor: "pointer", fontFamily: "inherit" }}
          >
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        )}
      </div>

      <button className="collapse-btn" onClick={onToggle}>
        <I.ChevronsLeft size={14} style={{ transform: effectiveCollapsed ? "rotate(180deg)" : "" }} />
        {!effectiveCollapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}

export function PhleboTopbar({
  onMenuClick,
  menuButtonRef,
  station, onStationChange,
  shift, onShiftChange,
  notifs, onMarkAllRead, onNotifAction, onNotifClick,
  onUserAction,
  station_role,        // "Vital Signs" | "Phlebotomy" | "Dashboard"
  onBack,              // when set, shows back/scan-another button
  onToggleQueue,
  queueCount,
}) {
  const t = useLang();
  const [stationOpen, setStationOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const closeAll = (except) => {
    if (except !== "station") setStationOpen(false);
    if (except !== "shift")   setShiftOpen(false);
    if (except !== "notif")   setNotifOpen(false);
    if (except !== "user")    setUserOpen(false);
  };

  const stationItem = stations.find(s => s.id === station) || stations[0];
  const shiftItem = shifts.find(s => s.id === shift) || shifts[0];
  const unread = (notifs || []).filter(n => n.unread).length;

  return (
    <header className="topbar">
      {onMenuClick && (
        <button
          type="button"
          ref={menuButtonRef}
          className="mobile-menu-btn"
          aria-label="Open navigation"
          onClick={onMenuClick}
        >
          <I.Menu size={18} />
        </button>
      )}

      {onBack ? (
        <button type="button" className="vp-back-btn" onClick={onBack}>
          <I.ChevronLeft size={16} />
          <span>Scan another</span>
        </button>
      ) : (
        <div className="topbar-title-mobile">{station_role || "Booth"}</div>
      )}

      <div className="vp-topbar-role" aria-label="Active station role">
        <span className="vp-role-eyebrow">Booth</span>
        <span className="vp-role-name">{station_role || "—"}</span>
      </div>

      <div className="row topbar-pill-row" style={{ gap: 12 }}>
        <div className="dropdown-anchor">
          <button
            className="pill-select"
            onClick={(e) => { e.stopPropagation(); closeAll("station"); setStationOpen(o => !o); }}
          >
            {stationItem.id} <I.ChevronDown size={14} />
          </button>
          <PillMenu open={stationOpen} onClose={() => setStationOpen(false)} items={stations} value={station} onSelect={onStationChange} titleKey="station.title" />
        </div>

        <div className="dropdown-anchor">
          <button
            className="pill-select"
            onClick={(e) => { e.stopPropagation(); closeAll("shift"); setShiftOpen(o => !o); }}
          >
            Shift: {t(shiftItem.labelKey)} <I.ChevronDown size={14} />
          </button>
          <PillMenu open={shiftOpen} onClose={() => setShiftOpen(false)} items={shifts} value={shift} onSelect={onShiftChange} titleKey="shift.title" />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div className="topbar-actions">
        {onToggleQueue && (
          <button type="button" className="vp-queue-pill" onClick={onToggleQueue}>
            <I.Users size={14} />
            <span>Queue</span>
            <span className="vp-queue-pill-count">{queueCount ?? 0}</span>
          </button>
        )}

        <div className="dropdown-anchor">
          <button
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); closeAll("notif"); setNotifOpen(o => !o); }}
          >
            <I.Bell size={16} />
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          <NotificationsPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            items={notifs}
            onMarkAllRead={onMarkAllRead}
            onItemAction={(n) => { onNotifAction?.(n); setNotifOpen(false); }}
            onItemClick={(n) => { onNotifClick?.(n); setNotifOpen(false); }}
          />
        </div>

        <div className="dropdown-anchor">
          <button
            className="user-chip"
            onClick={(e) => { e.stopPropagation(); closeAll("user"); setUserOpen(o => !o); }}
          >
            <div className="avatar av-purple">LN</div>
            <div className="meta">
              <strong>Linh Nguyen</strong>
              <div>{station_role === "Phlebotomy" ? "Phlebotomist" : "Nurse"}</div>
            </div>
          </button>
          <UserMenu open={userOpen} onClose={() => setUserOpen(false)} onAction={onUserAction} name="Linh Nguyen" role={station_role === "Phlebotomy" ? "Phlebotomist" : "Nurse"} />
        </div>
      </div>
    </header>
  );
}
