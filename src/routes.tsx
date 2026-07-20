import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { Spin } from "antd";
import { LoginPage } from "./pages/LoginPage";
import { PricingPage } from "./pages/PricingPage";
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
import { AdminCategoriesPage } from "./pages/AdminCategoriesPage";
import { AdminQbankPage } from "./pages/AdminQbankPage";
import { AdminQbankPaperPage } from "./pages/AdminQbankPaperPage";
import { PlatformConfigPage } from "./pages/PlatformConfigPage";
import { WithdrawalsPage } from "./pages/WithdrawalsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { RosterPage } from "./pages/RosterPage";
import { WalletPage } from "./pages/WalletPage";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireOnboarded } from "./auth/RequireOnboarded";
import { AppShell } from "./layout/AppShell";
import { StudentHomePage } from "./pages/StudentHomePage";
import { StudentCatalogPage } from "./pages/StudentCatalogPage";
import { StudentModelTestPage } from "./pages/StudentModelTestPage";
import { StudentExamLobbyPage } from "./pages/StudentExamLobbyPage";
import { ExamRunnerPage } from "./pages/ExamRunnerPage";
import { AttemptResultPage } from "./pages/AttemptResultPage";
import { MyAttemptsPage } from "./pages/MyAttemptsPage";
import { StudentRedirect } from "./auth/StudentRedirect";
import { StudentShell } from "./layout/StudentShell";
import { StudentOnboardingPage } from "./pages/StudentOnboardingPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { StudentQbankPage } from "./pages/StudentQbankPage";
import { StudentQbankPaperPage } from "./pages/StudentQbankPaperPage";
import { PracticeRunnerPage } from "./pages/PracticeRunnerPage";
import { StudentNotebookPage } from "./pages/StudentNotebookPage";

// routes.tsx is a route-config module (not fast-refreshed); the lazy wrapper lives here so the page keeps its own chunk.
// eslint-disable-next-line react-refresh/only-export-components
const StudentProgressPage = lazy(() =>
  import("./pages/StudentProgressPage").then((m) => ({ default: m.StudentProgressPage })));

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/pricing", element: <PricingPage /> },
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
      { index: true, element: <Navigate to="home" replace /> },
      { path: "onboarding", element: <StudentOnboardingPage /> },
      { path: "home", element: <StudentHomePage /> },
      { path: "qbank", element: <StudentQbankPage /> },
      { path: "qbank/papers/:id", element: <StudentQbankPaperPage /> },
      { path: "practice/:id", element: <PracticeRunnerPage /> },
      { path: "tests", element: <StudentCatalogPage /> },
      { path: "notebook", element: <StudentNotebookPage /> },
      { path: "profile", element: <StudentProfilePage /> },
      { path: "catalog", element: <Navigate to="/student/tests" replace /> },
      { path: "model-tests/:id", element: <StudentModelTestPage /> },
      { path: "exams/:id", element: <StudentExamLobbyPage /> },
      { path: "exams/:id/take", element: <ExamRunnerPage /> },
      { path: "attempts/:id/result", element: <AttemptResultPage /> },
      { path: "me", element: <MyAttemptsPage /> },
      {
        path: "progress",
        element: (
          <Suspense fallback={<Spin style={{ display: "block", margin: "48px auto" }} />}>
            <StudentProgressPage />
          </Suspense>
        ),
      },
      { path: "*", element: <Navigate to="/student/home" replace /> },
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
      { path: "selling/roster/:slotPurchaseId", element: <RosterPage /> },
      { path: "wallet", element: <WalletPage /> },
      { path: "org/profile", element: <OrgProfilePage /> },
      { path: "taxonomy", element: <TaxonomyPage /> },
      { path: "admin/taxonomy", element: <AdminTaxonomyPage /> },
      { path: "admin/categories", element: <AdminCategoriesPage /> },
      { path: "admin/qbank", element: <AdminQbankPage /> },
      { path: "admin/qbank/:id", element: <AdminQbankPaperPage /> },
      { path: "admin/platform-config", element: <PlatformConfigPage /> },
      { path: "admin/withdrawals", element: <WithdrawalsPage /> },
      { path: "admin/orders", element: <OrdersPage /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
];
