import { useEffect, useMemo, useState } from "react";
import { Dropdown } from "antd";
import { LogOut, Moon, PanelLeft, Search, Sun } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useThemeMode } from "../theme/ThemeContext";
import { BREADCRUMB_LABELS, ROLE_LABEL } from "./examinerNav";
import { CommandPalette } from "./CommandPalette";

// Mac gets ⌘, everything else Ctrl. userAgent (not the deprecated navigator.platform);
// wrong only for the rare spoofed UA, and the shortcut itself accepts either modifier.
const IS_MAC = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

export function ExaminerHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggle } = useThemeMode();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Segments with no entry in the shared map are dropped, not printed: that is how the
  // 24-hex ObjectId in /exams/:id/results disappears (the page's own PageHeader names the
  // entity). The typeof guard matters — a stray /constructor segment would otherwise
  // resolve through Object.prototype to a function and blow up as a React child.
  const crumbs = useMemo(
    () =>
      pathname
        .split("/")
        .filter(Boolean)
        .map((seg) => BREADCRUMB_LABELS[seg])
        .filter((label): label is string => typeof label === "string"),
    [pathname],
  );

  // Global shortcut, mounted with the header (Task 3 mounts the header once per shell, so
  // there is exactly one listener). preventDefault stops the browser's own ⌘K/Ctrl+K
  // (focus-the-address-bar-to-search in Chrome and Firefox).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // defaultPrevented: something closer to the event already claimed this chord
      // (SearchBar.tsx's "/" handler is the house precedent). !shiftKey keeps Firefox's
      // Cmd/Ctrl+Shift+K devtools console out of it. No target guard on purpose — firing
      // while a field has focus is exactly what a palette shortcut is for.
      if (e.defaultPrevented) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const roleLabel = ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? "";
  // Spread, not charAt(0): a name opening on an astral char would split its surrogate pair.
  const initial = [...(user?.name ?? user?.email ?? "").trim()][0] ?? "প";

  const menuItems = [
    {
      // A group label, not a disabled item: the identity block is a caption, and a disabled
      // menuitem would still be announced as an (unavailable) command.
      key: "identity",
      type: "group" as const,
      label: (
        <span className="ex-usermenu-id">
          <span className="ex-usermenu-email">{user?.email}</span>
          <span className="ex-usermenu-role">{roleLabel}</span>
        </span>
      ),
    },
    { type: "divider" as const },
    { key: "logout", label: "লগ আউট", icon: <LogOut size={14} strokeWidth={1.75} /> },
  ];

  return (
    <header className="ex-exhead">
      <button
        type="button"
        className="ex-exhead-iconbtn"
        onClick={onToggleSidebar}
        aria-label="সাইডবার দেখান বা লুকান"
      >
        <PanelLeft size={17} strokeWidth={1.75} aria-hidden />
      </button>
      {crumbs.length > 0 ? (
        <nav className="ex-exhead-crumbs" aria-label="ব্রেডক্রাম্ব">
          <ol>
            {crumbs.map((label, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={`${i}-${label}`}>
                  {i > 0 ? (
                    <span className="ex-exhead-sep" aria-hidden>
                      /
                    </span>
                  ) : null}
                  <span
                    className={isLast ? "ex-exhead-crumb is-current" : "ex-exhead-crumb"}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <span className="ex-exhead-spacer" />
      <button
        type="button"
        className="ex-exhead-search"
        onClick={() => setPaletteOpen(true)}
        aria-label="দ্রুত খুঁজুন"
      >
        <Search size={15} strokeWidth={1.75} aria-hidden />
        {/* aria-hidden: the accessible name is the aria-label above, and «⌘K» read out
            character by character is noise. */}
        <span className="ex-exhead-kbd" aria-hidden>
          {IS_MAC ? "⌘K" : "Ctrl K"}
        </span>
      </button>
      <button
        type="button"
        className="ex-exhead-iconbtn"
        onClick={toggle}
        aria-label="থিম বদলান"
      >
        {mode === "dark" ? (
          <Sun size={17} strokeWidth={1.75} aria-hidden />
        ) : (
          <Moon size={17} strokeWidth={1.75} aria-hidden />
        )}
      </button>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: menuItems,
          onClick: ({ key }) => {
            if (key === "logout") {
              logout();
              navigate("/login");
            }
          },
        }}
      >
        <button type="button" className="ex-exhead-user" aria-label="অ্যাকাউন্ট মেনু">
          <span className="ex-exhead-disc" aria-hidden>
            {initial}
          </span>
          <span aria-hidden>▾</span>
        </button>
      </Dropdown>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
