import { useLayoutEffect } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import bnBD from "antd/locale/bn_BD";
import { AuthProvider } from "./auth/AuthContext";
import { routes } from "./routes";
import { useThemeMode } from "./theme/ThemeContext";
import { buildTheme } from "./theme/antdTheme";

const queryClient = new QueryClient();
const router = createBrowserRouter(routes);

export function ThemedApp() {
  const { mode } = useThemeMode();

  // The ~50 `message.success/error/...` call sites across the app are antd STATICS: they
  // render into a holder mounted outside the React tree, so no ConfigProvider — and no
  // `<App>` wrapper either — can reach them, and in dark mode every toast came up white.
  // antd's own escape hatch for exactly this is the global config, which the static holder
  // reads back through `globalConfig().getTheme()` on each open (message/index.js:78). One
  // call here themes every toast and every remaining `Modal.*` static in both shells, which
  // is a far smaller change than threading `App.useApp()` through fifty handlers.
  //
  // The student density is the one passed on purpose: statics fire from both shells and the
  // two themes differ only in radius/font-size/control-height — the palette, which is the
  // whole point in dark mode, is identical. Layout, so a toast fired from the very first
  // click of a session cannot out-race the assignment.
  useLayoutEffect(() => {
    ConfigProvider.config({ theme: buildTheme("student", mode) });
  }, [mode]);

  return (
    <ConfigProvider locale={bnBD} theme={buildTheme("student", mode)}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
