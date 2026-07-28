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
