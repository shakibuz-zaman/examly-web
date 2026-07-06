import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { QuestionsListPage } from "./pages/QuestionsListPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { OrgProfilePage } from "./pages/OrgProfilePage";
import { TaxonomyPage } from "./pages/TaxonomyPage";
import { AdminTaxonomyPage } from "./pages/AdminTaxonomyPage";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireOnboarded } from "./auth/RequireOnboarded";
import { AppShell } from "./layout/AppShell";

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/onboarding",
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    ),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <RequireOnboarded>
          <AppShell />
        </RequireOnboarded>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "questions", element: <QuestionsListPage /> },
      { path: "org/profile", element: <OrgProfilePage /> },
      { path: "taxonomy", element: <TaxonomyPage /> },
      { path: "admin/taxonomy", element: <AdminTaxonomyPage /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
];
