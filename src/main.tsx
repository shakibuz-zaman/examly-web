import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "antd/dist/reset.css";
import "katex/dist/katex.min.css";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { AuthProvider } from "./auth/AuthContext";
import { routes } from "./routes";
import { ThemeModeProvider, useThemeMode } from "./theme/ThemeContext";
import { buildTheme } from "./theme/antdTheme";

const queryClient = new QueryClient();
const router = createBrowserRouter(routes);

// eslint-disable-next-line react-refresh/only-export-components -- entry file, never fast-refreshed (house pattern, see ThemeContext.tsx)
function ThemedApp() {
  const { mode } = useThemeMode();
  return (
    <ConfigProvider theme={buildTheme("student", mode)}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  </StrictMode>,
);
