import { useEffect, useState } from "react";
import { App, ConfigProvider } from "antd";
import bnBD from "antd/locale/bn_BD";
import { Outlet } from "react-router-dom";
import { ExaminerSidebar } from "../ui/ExaminerSidebar";
import { ExaminerHeader } from "../ui/ExaminerHeader";
import { buildTheme } from "../theme/antdTheme";
import { useThemeMode } from "../theme/ThemeContext";

// Below this the 220px rail costs more than it earns, so the shell drops to the 56px icon
// rail. The listener only reacts to *crossings*, which is deliberate: a manual toggle keeps
// whatever the user chose until the viewport crosses the boundary again.
const COLLAPSE_QUERY = "(max-width: 1100px)";

export function AppShell() {
  const { mode } = useThemeMode();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COLLAPSE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(COLLAPSE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ExaminerHeader is mounted exactly once per shell: it owns the window-level ⌘K listener
  // and renders the palette, so a second instance would double-toggle both.
  return (
    <ConfigProvider locale={bnBD} theme={buildTheme("examiner", mode)}>
      {/* antd's `App`, INSIDE the ConfigProvider: it publishes `message`/`notification`/`modal`
          instances that live under this theme, which the imported statics cannot (they render
          into their own detached root — that is why the dark-mode publish-gate dialog came up
          white with an antd-blue OK). Reach them with `App.useApp()`, never the static import.
          `display: contents` because `App` renders a real <div> by default and .ex-exshell is
          a grid whose parent must not introduce a box between it and #root. `component={false}`
          would drop the element entirely but warns under cssVar, which buildTheme leaves on.
          The four `inherit`s are not tidiness: `display: contents` removes the BOX, not the
          element, so .ant-app's own typography (14px/1.5714) still inherits down and would
          quietly re-metric every un-carded run of raw text off index.css's 16px Bangla
          settings. Handing each inherited property straight back through keeps the cascade
          exactly as it was before this wrapper existed. */}
      <App
        style={{
          display: "contents",
          fontSize: "inherit",
          lineHeight: "inherit",
          fontFamily: "inherit",
          color: "inherit",
        }}
      >
        <div className={`ex-exshell${collapsed ? " ex-exshell--collapsed" : ""}`}>
          <ExaminerSidebar collapsed={collapsed} />
          <div className="ex-exshell-main">
            <ExaminerHeader
              collapsed={collapsed}
              onToggleSidebar={() => setCollapsed((c) => !c)}
            />
            <main className="ex-exshell-content">
              <Outlet />
            </main>
          </div>
        </div>
      </App>
    </ConfigProvider>
  );
}
