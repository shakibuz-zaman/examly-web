import { useEffect, useState } from "react";
import { ConfigProvider } from "antd";
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
    </ConfigProvider>
  );
}
