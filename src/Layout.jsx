// === Sidebar + Topbar ===
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { I } from "./icons";
import { useLang } from "./i18n";
import { NotificationsPanel, PillMenu, UserMenu } from "./Notifications";
import { stations, shifts } from "./data";
import kuraLogo from "./assets/kura-logo.svg";

const LANGUAGES = ["Khmer", "English", "Vietnamese", "Thai", "French", "Korean"];

export function Sidebar({ collapsed, onToggle, active, onNavigate, lang, onLangChange, mobileOpen = false, onMobileClose, onTestBlankState }) {
  const t = useLang();
  const sidebarRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const effectiveCollapsed = collapsed && !isMobile;
  const items = [
    { id: "reception", key: "nav.reception", icon: "Home" },
    { id: "queue",     key: "nav.queue",     icon: "Users" },
    { id: "patients",  key: "nav.patients",  icon: "User" },
    { id: "orders",    key: "nav.orders",    icon: "ClipboardList" },
    { id: "billing",   key: "nav.billing",   icon: "Receipt" },
    { id: "documents", key: "nav.documents", icon: "FolderOpen" },
    { id: "reports",   key: "nav.reports",   icon: "BarChart" },
    { id: "settings",  key: "nav.settings",  icon: "Settings" },
  ];
  // On mobile, picking a nav item should close the drawer so the user lands
  // on the new screen with full viewport. Desktop ignores onMobileClose.
  const handleNav = (id) => {
    onNavigate(id);
    if (onMobileClose) onMobileClose();
  };
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const first = sidebarRef.current?.querySelector("button, select");
    first?.focus?.();
  }, [isMobile, mobileOpen]);
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
          <div className="brand-text">Kura <span className="sub">Reception</span></div>
        )}
        {isMobile && (
          <button type="button" className="sidebar-mobile-close" onClick={onMobileClose} aria-label="Close navigation">
            <I.X size={18} />
          </button>
        )}
      </div>
      <nav className="nav">
        {items.map(it => {
          const Ico = I[it.icon];
          const isActive = active === it.id;
          return (
            <button
              type="button"
              key={it.id}
              className={"nav-item" + (isActive ? " active" : "")}
              onClick={() => handleNav(it.id)}
              title={effectiveCollapsed ? t(it.key) : ""}
              aria-current={isActive ? "page" : undefined}
            >
              <Ico size={18} />
              {!effectiveCollapsed && <span>{t(it.key)}</span>}
            </button>
          );
        })}
      </nav>

      {/* Language switcher */}
      <div className="sidebar-lang" title={effectiveCollapsed ? "Language" : ""}>
        <I.Globe size={15} style={{ flexShrink: 0, color: "var(--ink-500)" }} />
        {!effectiveCollapsed && (
          <select
            value={lang}
            onChange={e => onLangChange(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--ink-700)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        )}
      </div>

      {onTestBlankState && (
        <button
          type="button"
          className="sidebar-dev-blank"
          onClick={onTestBlankState}
          title="Test blank state"
        >
          <span className="sidebar-dev-badge">DEV</span>
          {!effectiveCollapsed && <span>Test blank state</span>}
        </button>
      )}

      <button className="collapse-btn" onClick={onToggle}>
        <I.ChevronsLeft size={14} style={{ transform: effectiveCollapsed ? "rotate(180deg)" : "" }} />
        {!effectiveCollapsed && <span>{t("sidebar.collapse")}</span>}
      </button>
    </aside>
  );
}

const SEARCH_RECENTS_KEY = "kura.reception.searchRecents.v1";
const SEARCH_RECENTS_LIMIT = 6;

function readSearchRecents() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEARCH_RECENTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, SEARCH_RECENTS_LIMIT) : [];
  } catch {
    return [];
  }
}

function patientRecentSnapshot(p) {
  return {
    type: "patient",
    id: p.id,
    label: p.name || p.queueNumber || "Patient",
    queueNumber: p.queueNumber || "",
    mobile: p.mobile || "",
    initials: p.initials || "P",
    avatarColor: p.avatarColor || "av-blue",
    status: p.status || null,
    savedAt: Date.now(),
  };
}

function recentKey(item) {
  return item.type === "patient" ? `patient:${item.id}` : `query:${(item.query || "").toLowerCase()}`;
}

// Status filter chips — let the nurse triage by patient state without scanning labels.
// Tone-grouped so the list stays short: needs attention, in flight, done.
const STATUS_FILTERS = [
  { id: "stuck",    label: "Needs attention", tones: ["warn", "danger"] },
  { id: "active",   label: "In progress",     tones: ["info"] },
  { id: "done",     label: "Done",            tones: ["success"] },
];
function patientMatchesStatusFilter(p, filterId) {
  if (!filterId) return true;
  const def = STATUS_FILTERS.find(f => f.id === filterId);
  if (!def) return true;
  return def.tones.includes(p.status?.tone);
}

function patientSearchMatch(p, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return null;
  const digits = query.replace(/\D/g, "");
  const name = (p.name || "").toLowerCase();
  const queue = (p.queueNumber || "").toLowerCase();
  const mobile = (p.mobile || p.phoneNumber || "").toLowerCase();
  const phoneDigits = mobile.replace(/\D/g, "");
  const idNumber = (p.idNumber || "").toLowerCase();
  const reasons = Array.isArray(p.visitReason) ? p.visitReason : [];

  if (queue && queue.includes(query)) return { score: 100, label: "Queue" };
  if (idNumber && idNumber.includes(query)) return { score: 92, label: "VID" };
  if (digits.length >= 3 && phoneDigits.includes(digits)) return { score: 88, label: "Phone" };
  if (name.startsWith(query)) return { score: 82, label: "Name" };
  if (name.includes(query)) return { score: 72, label: "Name" };
  if (reasons.some(r => (r || "").toLowerCase().includes(query))) return { score: 54, label: "Reason" };
  return null;
}

function hydrateRecentPatient(item, patients) {
  if (item.type !== "patient") return item;
  const live = patients.find(p => p.id === item.id);
  return live ? { ...patientRecentSnapshot(live), savedAt: item.savedAt || Date.now() } : item;
}

function SearchBar({ patients = [], onSearch, onNewWalkIn }) {
  const t = useLang();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [recents, setRecents] = useState(readSearchRecents);
  const [statusFilter, setStatusFilter] = useState(null);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const statusCounts = useMemo(() => {
    const counts = Object.create(null);
    for (const f of STATUS_FILTERS) counts[f.id] = 0;
    for (const p of patients) {
      for (const f of STATUS_FILTERS) {
        if (f.tones.includes(p.status?.tone)) counts[f.id]++;
      }
    }
    return counts;
  }, [patients]);

  const patientResults = useMemo(() => {
    if (!hasQuery) return [];
    return patients
      .map(patient => ({ patient, match: patientSearchMatch(patient, trimmedQuery) }))
      .filter(result => result.match)
      .filter(result => patientMatchesStatusFilter(result.patient, statusFilter))
      .sort((a, b) => b.match.score - a.match.score || (a.patient.name || "").localeCompare(b.patient.name || ""))
      .slice(0, 12);
  }, [patients, trimmedQuery, hasQuery, statusFilter]);

  const recentItems = useMemo(() => (
    recents
      .map(item => hydrateRecentPatient(item, patients))
      .filter(item => item.type === "query" ? !!item.query : !!item.id)
      .slice(0, SEARCH_RECENTS_LIMIT)
  ), [patients, recents]);

  // When a status filter is on (no query), surface patients in that bucket
  // instead of recent searches — the nurse is triaging, not recalling.
  const statusFilteredPatients = useMemo(() => {
    if (hasQuery || !statusFilter) return [];
    return patients
      .filter(p => patientMatchesStatusFilter(p, statusFilter))
      .slice(0, 20);
  }, [patients, hasQuery, statusFilter]);

  const resultItems = useMemo(() => {
    if (hasQuery) {
      return patientResults.map(({ patient, match }) => ({ type: "patient", patient, match }));
    }
    if (statusFilter) {
      return statusFilteredPatients.map(p => ({ type: "statusPatient", patient: p }));
    }
    return recentItems.map(item => item.type === "patient"
      ? { type: "recentPatient", patient: item }
      : { type: "recentQuery", query: item.query });
  }, [hasQuery, patientResults, recentItems, statusFilter, statusFilteredPatients]);
  const actionItems = onNewWalkIn ? [{ type: "newWalkIn", query: trimmedQuery }] : [];
  const menuItems = [...resultItems, ...actionItems];
  const dropdownOpen = open && (menuItems.length > 0 || hasQuery);

  const saveRecent = useCallback((item) => {
    setRecents(prev => {
      const next = [item, ...prev.filter(existing => recentKey(existing) !== recentKey(item))]
        .slice(0, SEARCH_RECENTS_LIMIT);
      try {
        window.localStorage.setItem(SEARCH_RECENTS_KEY, JSON.stringify(next));
      } catch {
        // localStorage may be unavailable in privacy modes; search still works.
      }
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    try {
      window.localStorage.removeItem(SEARCH_RECENTS_KEY);
    } catch {
      // Ignore storage failures; clearing UI state is enough.
    }
  }, []);

  const closeSearch = useCallback(() => {
    setQuery("");
    setOpen(false);
    setCursor(-1);
    inputRef.current?.blur();
  }, []);

  const commitPatient = useCallback((p) => {
    saveRecent(patientRecentSnapshot(p));
    onSearch && onSearch(p.id);
    closeSearch();
  }, [closeSearch, onSearch, saveRecent]);

  const commitQuery = useCallback((value) => {
    setQuery(value);
    setOpen(true);
    setCursor(0);
    inputRef.current?.focus();
  }, []);

  const commitNewWalkIn = useCallback((value) => {
    const next = (value || "").trim();
    if (next) saveRecent({ type: "query", query: next, savedAt: Date.now() });
    onNewWalkIn?.();
    closeSearch();
  }, [closeSearch, onNewWalkIn, saveRecent]);

  const commitItem = useCallback((item) => {
    if (!item) return;
    if (item.type === "patient" || item.type === "recentPatient" || item.type === "statusPatient") commitPatient(item.patient);
    else if (item.type === "recentQuery") commitQuery(item.query);
    else if (item.type === "newWalkIn") commitNewWalkIn(item.query);
  }, [commitNewWalkIn, commitPatient, commitQuery]);

  // ⌘K / Ctrl+K global focus
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setCursor(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKey = (e) => {
    if (e.key === "Escape") {
      if (query) {
        e.preventDefault();
        setQuery("");
        setCursor(-1);
        setOpen(true);
      } else {
        setOpen(false);
        setCursor(-1);
        inputRef.current?.blur();
      }
      return;
    }
    if (!open || menuItems.length === 0) {
      if (e.key === "ArrowDown" && menuItems.length > 0) {
        e.preventDefault();
        setOpen(true);
        setCursor(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, menuItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      if (cursor >= 0 && menuItems[cursor]) commitItem(menuItems[cursor]);
      else if (patientResults.length === 1) commitPatient(patientResults[0].patient);
    }
  };

  const TONE_COLORS = {
    success: "var(--success-500)",
    warn: "var(--warn-500)",
    danger: "var(--danger-500)",
    info: "var(--info-500)",
  };

  const getItemIndex = (item) => menuItems.indexOf(item);
  const patientMeta = (p) => [p.queueNumber, p.mobile || p.phoneNumber, p.idNumber ? `VID ${p.idNumber}` : ""].filter(Boolean).join(" · ");
  const renderPatientResult = (item, label) => {
    const idx = getItemIndex(item);
    const p = item.patient;
    const tone = TONE_COLORS[p.status?.tone] || "var(--ink-500)";
    return (
      <button
        type="button"
        key={`${item.type}-${p.id}`}
        className={"topbar-search-result" + (idx === cursor ? " hovered" : "")}
        onClick={() => commitPatient(p)}
        onMouseEnter={() => setCursor(idx)}
        role="option"
        aria-selected={idx === cursor}
      >
        <div className={"avatar av-sm " + (p.avatarColor || "av-blue")}>{p.initials || "P"}</div>
        <div className="topbar-search-result-main">
          <div className="topbar-search-result-name">
            <span>{p.name || p.label || "Unnamed patient"}</span>
            <span className="topbar-search-match">{label}</span>
          </div>
          <div className="topbar-search-result-meta">{patientMeta(p)}</div>
        </div>
        {p.status?.label && (
          <span className="topbar-search-status" style={{ "--status-color": tone }}>
            {p.status.label}
          </span>
        )}
      </button>
    );
  };
  const renderRecentQuery = (item) => {
    const idx = getItemIndex(item);
    return (
      <button
        type="button"
        key={`query-${item.query}`}
        className={"topbar-search-result topbar-search-recent-query" + (idx === cursor ? " hovered" : "")}
        onClick={() => commitQuery(item.query)}
        onMouseEnter={() => setCursor(idx)}
        role="option"
        aria-selected={idx === cursor}
      >
        <span className="topbar-search-mini-icon"><I.Clock size={13} /></span>
        <span className="topbar-search-result-main">
          <span className="topbar-search-result-name">{item.query}</span>
          <span className="topbar-search-result-meta">Recent search</span>
        </span>
        <I.ChevronRight size={13} className="topbar-search-go" />
      </button>
    );
  };
  const renderNewWalkIn = (item) => {
    const idx = getItemIndex(item);
    return (
      <button
        type="button"
        key="new-walk-in"
        className={"topbar-search-result topbar-search-action" + (idx === cursor ? " hovered" : "")}
        onClick={() => commitNewWalkIn(item.query)}
        onMouseEnter={() => setCursor(idx)}
        role="option"
        aria-selected={idx === cursor}
      >
        <span className="topbar-search-action-icon"><I.Plus size={14} /></span>
        <span className="topbar-search-result-main">
          <span className="topbar-search-result-name">New walk-in</span>
          <span className="topbar-search-result-meta">
            {item.query ? `No match? Start intake for "${item.query}"` : "Create a new patient visit"}
          </span>
        </span>
        <I.ArrowRight size={13} className="topbar-search-go" />
      </button>
    );
  };

  return (
    <div className="search-wrap topbar-search-wrap" ref={wrapRef}>
      <div className={"search" + (dropdownOpen ? " search-active" : "")}>
        <I.Search size={15} style={{ color: "var(--ink-400)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={query}
          placeholder={t("topbar.search")}
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls="topbar-search-dropdown"
          aria-autocomplete="list"
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear patient search"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ink-400)", display: "flex" }}
            onClick={() => { setQuery(""); setOpen(true); setCursor(-1); inputRef.current?.focus(); }}
          >
            <I.X size={13} />
          </button>
        ) : (
          <span className="kbd">⌘ K</span>
        )}
      </div>

      {dropdownOpen && (
        <div id="topbar-search-dropdown" className="search-dropdown topbar-search-dropdown" role="listbox">
          <div className="topbar-search-filters" role="tablist" aria-label="Filter by patient status">
            <button
              type="button"
              role="tab"
              aria-selected={!statusFilter}
              className={"topbar-search-filter" + (!statusFilter ? " is-active" : "")}
              onClick={() => { setStatusFilter(null); setCursor(-1); }}
            >All</button>
            {STATUS_FILTERS.map(f => {
              const active = statusFilter === f.id;
              const count = statusCounts[f.id] || 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={"topbar-search-filter topbar-search-filter-" + f.id + (active ? " is-active" : "")}
                  onClick={() => { setStatusFilter(active ? null : f.id); setCursor(-1); }}
                >
                  <span className="topbar-search-filter-dot" aria-hidden="true" />
                  <span>{f.label}</span>
                  <span className="topbar-search-filter-count">{count}</span>
                </button>
              );
            })}
          </div>
          {hasQuery ? (
            <>
              {patientResults.length > 0 && (
                <>
                  <div className="search-dropdown-label">Patients{statusFilter ? ` · ${STATUS_FILTERS.find(f => f.id === statusFilter)?.label}` : ""}</div>
                  {resultItems.map(item => renderPatientResult(item, item.match?.label || "Match"))}
                </>
              )}
              {patientResults.length === 0 && (
                <div className="topbar-search-empty">
                  <I.Search size={15} />
                  <span>No patient found for <strong>{trimmedQuery}</strong>{statusFilter ? ` in ${STATUS_FILTERS.find(f => f.id === statusFilter)?.label}` : ""}</span>
                </div>
              )}
            </>
          ) : statusFilter ? (
            <>
              <div className="search-dropdown-label">{STATUS_FILTERS.find(f => f.id === statusFilter)?.label} · {statusFilteredPatients.length}</div>
              {statusFilteredPatients.length > 0 ? (
                resultItems.map(item => renderPatientResult(item, item.patient.status?.label || "Status"))
              ) : (
                <div className="topbar-search-empty topbar-search-empty-compact">
                  <I.Check size={14} />
                  <span>None in this bucket</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="search-dropdown-label topbar-search-label-row">
                <span>Recent searches</span>
                {recentItems.length > 0 && (
                  <button type="button" className="topbar-search-clear-recents" onClick={clearRecents}>
                    Clear
                  </button>
                )}
              </div>
              {recentItems.length > 0 ? (
                resultItems.map(item => item.type === "recentPatient"
                  ? renderPatientResult(item, "Recent")
                  : renderRecentQuery(item))
              ) : (
                <div className="topbar-search-empty topbar-search-empty-compact">
                  <I.Clock size={14} />
                  <span>No recent searches yet</span>
                </div>
              )}
            </>
          )}
          {actionItems.length > 0 && (
            <>
              <div className="search-dropdown-label">Quick action</div>
              {actionItems.map(renderNewWalkIn)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Topbar({
  onMenuClick,
  menuButtonRef,
  onNewWalkIn,
  notifications,
  station,
  onStationChange,
  shift,
  onShiftChange,
  notifs,
  onMarkAllRead,
  onNotifAction,
  onNotifClick,
  onUserAction,
  onSearch,
  patients,
}) {
  const t = useLang();
  const [stationOpen, setStationOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const closeAll = (except) => {
    if (except !== "station")  setStationOpen(false);
    if (except !== "shift")    setShiftOpen(false);
    if (except !== "notif")    setNotifOpen(false);
    if (except !== "user")     setUserOpen(false);
  };

  const stationItem = stations.find(s => s.id === station) || stations[0];
  const shiftItem = shifts.find(s => s.id === shift) || shifts[0];

  return (
    <header className="topbar">
      {/* Mobile menu trigger — desktop hides via CSS so this slot reverts
         to the regular flex flow without disturbing the existing layout. */}
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
      <div className="topbar-title-mobile">Reception</div>
      <div className="row topbar-pill-row" style={{ gap: 12 }}>
        <div className="dropdown-anchor">
          <button
            className="pill-select"
            onClick={(e) => { e.stopPropagation(); closeAll("station"); setStationOpen(o => !o); }}
          >
            {stationItem.id} <I.ChevronDown size={14} />
          </button>
          <PillMenu
            open={stationOpen}
            onClose={() => setStationOpen(false)}
            items={stations}
            value={station}
            onSelect={onStationChange}
            titleKey="station.title"
          />
        </div>

        <div className="dropdown-anchor">
          <button
            className="pill-select"
            onClick={(e) => { e.stopPropagation(); closeAll("shift"); setShiftOpen(o => !o); }}
          >
            {t("topbar.shift")}: {t(shiftItem.labelKey)} <I.ChevronDown size={14} />
          </button>
          <PillMenu
            open={shiftOpen}
            onClose={() => setShiftOpen(false)}
            items={shifts}
            value={shift}
            onSelect={onShiftChange}
            titleKey="shift.title"
          />
        </div>
      </div>

      <SearchBar patients={patients} onSearch={onSearch} onNewWalkIn={onNewWalkIn} />

      <div className="topbar-actions">
        <div className="dropdown-anchor">
          <button
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); closeAll("notif"); setNotifOpen(o => !o); }}
          >
            <I.Bell size={16} />
            {notifications > 0 && <span className="badge">{notifications}</span>}
          </button>
          <NotificationsPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            items={notifs}
            onMarkAllRead={onMarkAllRead}
            onItemAction={(n) => { onNotifAction(n); setNotifOpen(false); }}
            onItemClick={(n) => { onNotifClick(n); setNotifOpen(false); }}
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
              <div>Receptionist</div>
            </div>
          </button>
          <UserMenu
            open={userOpen}
            onClose={() => setUserOpen(false)}
            onAction={onUserAction}
            name="Linh Nguyen"
            role="Receptionist"
          />
        </div>

        <button
          className="btn btn-secondary topbar-walkin-btn"
          onClick={onNewWalkIn}
          aria-label={t("topbar.newWalkin")}
          aria-keyshortcuts="Control+N Meta+N"
          title={`${t("topbar.newWalkin")} · Ctrl+N`}
        >
          <I.Plus size={16} />
          <span className="topbar-walkin-label">{t("topbar.newWalkin")}</span>
          <span className="topbar-walkin-kbd" aria-hidden="true">Ctrl+N</span>
        </button>
      </div>
    </header>
  );
}
