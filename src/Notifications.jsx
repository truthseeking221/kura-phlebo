// === Notifications panel + pill / user menus ===
import React, { useEffect, useRef } from "react";
import { I } from "./icons";
import { useLang } from "./i18n";

export function useClickOutside(ref, onClose, active) {
  useEffect(() => {
    if (!active) return;
    let attached = false;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const tid = setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
      attached = true;
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(tid);
      if (attached) document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, ref, onClose]);
}

function toneColor(tone) {
  if (tone === "danger")  return "var(--danger-500)";
  if (tone === "warn")    return "var(--warn-500)";
  if (tone === "success") return "var(--success-500)";
  return "var(--brand-500)";
}
function toneBg(tone) {
  if (tone === "danger")  return "var(--danger-50)";
  if (tone === "warn")    return "var(--warn-50)";
  if (tone === "success") return "var(--success-50)";
  return "var(--brand-50)";
}

export function NotificationsPanel({ open, onClose, items, onMarkAllRead, onItemAction, onItemClick }) {
  const t = useLang();
  const ref = useRef(null);
  useClickOutside(ref, onClose, open);
  if (!open) return null;
  const unread = items.filter(n => !n.read).length;
  return (
    <>
      <button
        type="button"
        className="notif-mobile-scrim"
        aria-label="Close notifications"
        onClick={onClose}
      />
      <div
        className="dropdown-panel notif-panel"
        ref={ref}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={t("notif.title")}
      >
        <div className="notif-head">
          <div className="notif-head-copy">
            <div className="notif-title">{t("notif.title")}</div>
            {unread > 0 && (
              <div className="notif-sub">{unread} {t("notif.unread")}</div>
            )}
          </div>
          <div className="notif-head-actions">
            {unread > 0 && (
              <button type="button" className="link-btn notif-mark-read" onClick={onMarkAllRead}>{t("notif.markAllRead")}</button>
            )}
            <button type="button" className="notif-close" aria-label="Close notifications" onClick={onClose}>
              <I.X size={16} />
            </button>
          </div>
        </div>
        <div className="notif-body">
          {items.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-ico"><I.CheckCircle size={22} /></div>
              <div className="notif-empty-title">{t("notif.empty")}</div>
              <div className="notif-empty-sub">{t("notif.emptySub")}</div>
            </div>
          ) : items.map(n => {
            const Ico = I[n.icon] || I.Bell;
            return (
              <div
                key={n.id}
                className={"notif-item" + (n.read ? "" : " unread")}
                onClick={() => onItemClick && onItemClick(n)}
              >
                <div className="notif-item-ico" style={{ background: toneBg(n.tone), color: toneColor(n.tone) }}>
                  <Ico size={16} />
                </div>
                <div className="notif-item-body">
                  <div className="notif-item-title">{t(n.titleKey)}</div>
                  <div className="notif-item-text">{t(n.bodyKey, n.bodyParams)}</div>
                  <div className="notif-item-foot">
                    <span className="notif-item-time">{t(n.timeKey, n.timeParams)}</span>
                    {n.actionKey && (
                      <button
                        type="button"
                        className="notif-action"
                        onClick={(e) => { e.stopPropagation(); onItemAction && onItemAction(n); }}
                      >
                        {t(n.actionKey)} <I.ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {!n.read && <span className="notif-dot" />}
              </div>
            );
          })}
        </div>
        <div className="notif-foot">
          <button type="button" className="link-btn" onClick={onClose}>{t("notif.viewAll")}</button>
        </div>
      </div>
    </>
  );
}

export function PillMenu({ open, onClose, items, value, onSelect, titleKey, align = "left" }) {
  const t = useLang();
  const ref = useRef(null);
  useClickOutside(ref, onClose, open);
  if (!open) return null;
  return (
    <div
      className="dropdown-panel pill-menu"
      ref={ref}
      onClick={e => e.stopPropagation()}
      style={{ [align]: 0 }}
    >
      {titleKey && <div className="pill-menu-title">{t(titleKey)}</div>}
      {items.map(it => (
        <button
          key={it.id}
          className={"pill-menu-item" + (it.id === value ? " active" : "")}
          onClick={() => { onSelect(it.id); onClose(); }}
        >
          <div className="pill-menu-item-main">
            <div className="pill-menu-item-label">{it.id}{it.labelKey ? " · " + t(it.labelKey) : ""}</div>
            {it.caption && <div className="pill-menu-item-cap">{it.caption}</div>}
            {it.time && <div className="pill-menu-item-cap">{it.time}</div>}
          </div>
          {it.id === value && <I.Check size={14} />}
        </button>
      ))}
    </div>
  );
}

export function UserMenu({ open, onClose, onAction, name, role }) {
  const t = useLang();
  const ref = useRef(null);
  useClickOutside(ref, onClose, open);
  if (!open) return null;
  const items = [
    { id: "profile",     icon: "User",     labelKey: "user.profile" },
    { id: "preferences", icon: "Settings", labelKey: "user.preferences" },
    { id: "help",        icon: "AlertCircle", labelKey: "user.help" },
    { id: "signout",     icon: "ChevronRight", labelKey: "user.signOut", danger: true },
  ];
  return (
    <div className="dropdown-panel user-menu" ref={ref} onClick={e => e.stopPropagation()}>
      <div className="user-menu-head">
        <div className="user-menu-sub">{t("user.signedInAs")}</div>
        <div className="user-menu-name">{name}</div>
        <div className="user-menu-role">{role}</div>
      </div>
      <div className="user-menu-body">
        {items.map(it => {
          const Ico = I[it.icon] || I.User;
          return (
            <button
              key={it.id}
              className={"user-menu-item" + (it.danger ? " danger" : "")}
              onClick={() => { onAction(it.id); onClose(); }}
            >
              <Ico size={15} />
              <span>{t(it.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
