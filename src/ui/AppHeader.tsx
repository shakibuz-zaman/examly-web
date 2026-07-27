import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Dropdown, Grid } from "antd";
import { Moon, Search, Sun } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { categoryShortLabel } from "../api/categories";
import { useThemeMode } from "../theme/ThemeContext";
import { useActiveTrack } from "../features/tracks/TrackContext";
import {
  getBandVisible,
  getSearchTargetPresent,
  subscribeBand,
  subscribeSearchTarget,
} from "./bandSentinel";
import { STUDENT_NAV } from "./nav";
import { Sheet } from "./Sheet";

// rAF-throttled scroll flag for the sticky bar's shadow.
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > threshold));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return scrolled;
}

function TrackPill() {
  const { tracks, activeTrackId, setActiveTrackId } = useActiveTrack();
  const isDesktop = Grid.useBreakpoint().md;
  const [open, setOpen] = useState(false);
  if (tracks.length === 0) return null;
  const active = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];
  if (tracks.length === 1) {
    return (
      <span className="ex-track-pill ex-track-pill--static">
        <span className="ex-track-pill-label">{categoryShortLabel(active)}</span>
      </span>
    );
  }
  if (isDesktop) {
    return (
      <Dropdown
        trigger={["click"]}
        menu={{
          items: tracks.map((t) => ({ key: t.id, label: categoryShortLabel(t) })),
          selectable: true,
          selectedKeys: activeTrackId ? [activeTrackId] : [],
          onClick: ({ key }) => setActiveTrackId(key),
        }}
      >
        <button type="button" className="ex-track-pill">
          <span className="ex-track-pill-label">{categoryShortLabel(active)}</span>
          <span aria-hidden>▾</span>
        </button>
      </Dropdown>
    );
  }
  // Mobile (spec §5): tap opens a bottom switcher sheet instead of the dropdown (D11).
  // No onClick on the trigger — Sheet owns it (see Sheet.tsx).
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="ট্র্যাক বদলান"
      trigger={
        <button type="button" className="ex-track-pill">
          <span className="ex-track-pill-label">{categoryShortLabel(active)}</span>
          <span aria-hidden>▾</span>
        </button>
      }
    >
      <div className="ex-tracksheet" role="listbox" aria-label="ট্র্যাক">
        {tracks.map((t) => (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={t.id === active.id}
            className={t.id === active.id ? "ex-tracksheet-row is-selected" : "ex-tracksheet-row"}
            onClick={() => {
              setActiveTrackId(t.id);
              setOpen(false);
            }}
          >
            <span>{categoryShortLabel(t)}</span>
            {t.id === active.id && <span aria-hidden>✓</span>}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggle } = useThemeMode();
  const isDesktop = Grid.useBreakpoint().md;
  const scrolled = useScrolled();
  // Band-less pages keep the sentinel at its default `true`, so they never compact.
  const bandVisible = useSyncExternalStore(subscribeBand, getBandVisible);
  const compact = isDesktop === true && !bandVisible;
  // Only offer the search shortcut when a SearchBar is actually mounted to focus —
  // otherwise the icon would be dead (e.g. the catalog's "আমার পরীক্ষা" tab).
  const searchTargetPresent = useSyncExternalStore(subscribeSearchTarget, getSearchTargetPresent);

  // Tracked so an in-flight focus never fires after unmount.
  const focusTimerRef = useRef(0);
  useEffect(() => () => window.clearTimeout(focusTimerRef.current), []);

  const initial = (user?.name ?? "").trim().charAt(0) || "প";

  const menuItems = [
    { key: "profile", label: "প্রোফাইল" },
    { key: "me", label: "আমার পরীক্ষা" },
    // Mobile keeps the top bar minimal — theme toggle lives in this menu there.
    ...(isDesktop ? [] : [{ key: "theme", label: mode === "dark" ? "লাইট মোড" : "ডার্ক মোড" }]),
    { type: "divider" as const },
    { key: "logout", label: "লগআউট" },
  ];

  return (
    <header
      className={["ex-appbar", scrolled ? "is-scrolled" : "", compact ? "is-compact" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ex-appbar-inner">
        <Link to="/student/home" className="ex-appbar-logo">
          Examly
        </Link>
        {isDesktop && (
          <nav className="ex-appbar-nav" aria-label="প্রধান নেভিগেশন">
            {STUDENT_NAV.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to}>
                <Icon size={16} strokeWidth={1.75} aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="ex-appbar-right">
          {compact && searchTargetPresent && (
            <button
              type="button"
              className="ex-appbar-iconbtn"
              aria-label="খুঁজুন"
              onClick={() => {
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
                window.clearTimeout(focusTimerRef.current);
                focusTimerRef.current = window.setTimeout(
                  // preventScroll: a plain focus() would scroll the input into view
                  // itself, which cancels the smooth scroll mid-animation.
                  () => document.getElementById("ex-page-search")?.focus({ preventScroll: true }),
                  reduce ? 0 : 350,
                );
              }}
            >
              <Search size={17} strokeWidth={1.75} aria-hidden />
            </button>
          )}
          <TrackPill />
          {isDesktop && (
            <button
              type="button"
              className="ex-appbar-iconbtn"
              onClick={toggle}
              aria-label="থিম বদলান"
            >
              {mode === "dark" ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
            </button>
          )}
          <Dropdown
            trigger={["click"]}
            menu={{
              items: menuItems,
              onClick: ({ key }) => {
                if (key === "profile") navigate("/student/profile");
                else if (key === "me") navigate("/student/me");
                else if (key === "theme") toggle();
                else if (key === "logout") {
                  logout();
                  navigate("/login");
                }
              },
            }}
          >
            <button type="button" className="ex-avatar" aria-label="অ্যাকাউন্ট মেনু">
              {initial}
            </button>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
