import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { QuestionsListPage } from "./pages/QuestionsListPage";
import { QuestionEditorPage } from "./pages/QuestionEditorPage";
import { ExamsListPage } from "./pages/ExamsListPage";
import { ExamBuilderPage } from "./pages/ExamBuilderPage";
import { ExamResultsPage } from "./pages/ExamResultsPage";
import { ModelTestsListPage } from "./pages/ModelTestsListPage";
import { ModelTestBuilderPage } from "./pages/ModelTestBuilderPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { OrgProfilePage } from "./pages/OrgProfilePage";
import { TaxonomyPage } from "./pages/TaxonomyPage";
import { AdminTaxonomyPage } from "./pages/AdminTaxonomyPage";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireOnboarded } from "./auth/RequireOnboarded";
import { AppShell } from "./layout/AppShell";
import { StudentCatalogPage } from "./pages/StudentCatalogPage";
import { StudentModelTestPage } from "./pages/StudentModelTestPage";
import { StudentExamLobbyPage } from "./pages/StudentExamLobbyPage";
import { ExamRunnerPage } from "./pages/ExamRunnerPage";
import { AttemptResultPage } from "./pages/AttemptResultPage";
import { MyAttemptsPage } from "./pages/MyAttemptsPage";
import { StudentRedirect } from "./auth/StudentRedirect";
import { StudentShell } from "./layout/StudentShell";

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
    path: "/student",
    element: (
      <RequireAuth role="student">
        <StudentShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/student/catalog" replace /> },
      { path: "catalog", element: <StudentCatalogPage /> },
      { path: "model-tests/:id", element: <StudentModelTestPage /> },
      { path: "exams/:id", element: <StudentExamLobbyPage /> },
      { path: "exams/:id/take", element: <ExamRunnerPage /> },
      { path: "attempts/:id/result", element: <AttemptResultPage /> },
      { path: "me", element: <MyAttemptsPage /> },
      { path: "*", element: <Navigate to="/student/catalog" replace /> },
    ],
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <StudentRedirect>
          <RequireOnboarded>
            <AppShell />
          </RequireOnboarded>
        </StudentRedirect>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "questions", element: <QuestionsListPage /> },
      { path: "questions/new", element: <QuestionEditorPage /> },
      { path: "questions/:id", element: <QuestionEditorPage /> },
      { path: "exams", element: <ExamsListPage /> },
      { path: "exams/new", element: <ExamBuilderPage /> },
      { path: "exams/:id", element: <ExamBuilderPage /> },
      { path: "exams/:id/results", element: <ExamResultsPage /> },
      { path: "model-tests", element: <ModelTestsListPage /> },
      { path: "model-tests/new", element: <ModelTestBuilderPage /> },
      { path: "model-tests/:id", element: <ModelTestBuilderPage /> },
      { path: "org/profile", element: <OrgProfilePage /> },
      { path: "taxonomy", element: <TaxonomyPage /> },
      { path: "admin/taxonomy", element: <AdminTaxonomyPage /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
];
