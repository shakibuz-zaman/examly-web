import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { applyCssVars } from "./cssVars";
import type { ThemeMode } from "./tokens";

const STORAGE_KEY = "examly-theme";

function initialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type Ctx = { mode: ThemeMode; setMode: (m: ThemeMode) => void; toggle: () => void };
const ThemeModeContext = createContext<Ctx | null>(null);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  useEffect(() => applyCssVars(mode), [mode]);
  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
  }, []);
  const toggle = useCallback(
    () => setMode(mode === "dark" ? "light" : "dark"), [mode, setMode]);
  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- house pattern (see routes.tsx:31)
export function useThemeMode(): Ctx {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error("useThemeMode outside ThemeModeProvider");
  return ctx;
}
