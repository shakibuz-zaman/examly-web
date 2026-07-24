import { useEffect, useState } from "react";
import { Dropdown, Grid } from "antd";
import {
  BookOpen, FileText, House, Moon, NotebookPen, Sun, TrendingUp, type LucideIcon,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { categoryShortLabel } from "../api/categories";
import { useThemeMode } from "../theme/ThemeContext";
import { useActiveTrack } from "../features/tracks/TrackContext";

// eslint-disable-next-line react-refresh/only-export-components -- house pattern (see theme/ThemeContext.tsx); BottomTabBar consumes this
export const STUDENT_NAV: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: "/student/home", label: "হোম", Icon: House },
  { to: "/student/qbank", label: "প্রশ্নব্যাংক", Icon: BookOpen },
  { to: "/student/tests", label: "মডেল টেস্ট", Icon: FileText },
  { to: "/student/notebook", label: "ভুলের খাতা", Icon: NotebookPen },
  { to: "/student/progress", label: "প্রোগ্রেস", Icon: TrendingUp },
];

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
  if (tracks.length === 0) return null;
  const active = tracks.find((t) => t.id === activeTrackId) ?? tracks[0];
  if (tracks.length === 1) {
    return (
      <span className="ex-track-pill ex-track-pill--static">
        <span className="ex-track-pill-label">{categoryShortLabel(active)}</span>
      </span>
    );
  }
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

export function AppHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggle } = useThemeMode();
  const isDesktop = Grid.useBreakpoint().md;
  const scrolled = useScrolled();

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
    <header className={scrolled ? "ex-appbar is-scrolled" : "ex-appbar"}>
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
