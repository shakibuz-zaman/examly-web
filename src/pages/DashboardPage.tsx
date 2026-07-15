import { lazy, Suspense } from "react";
import { Spin } from "antd";

// Keeps recharts out of the main bundle — same pattern as StudentProgressPage.
const OrgDashboard = lazy(() =>
  import("../features/analytics/examiner/OrgDashboard").then((m) => ({
    default: m.OrgDashboard,
  })));

export function DashboardPage() {
  return (
    <Suspense fallback={<Spin style={{ display: "block", margin: "48px auto" }} />}>
      <OrgDashboard />
    </Suspense>
  );
}
