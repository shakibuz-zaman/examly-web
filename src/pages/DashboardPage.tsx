import { lazy, Suspense } from "react";
import { Spin } from "antd";

// Keeps recharts out of the main bundle — same pattern as StudentProgressPage.
const OrgDashboard = lazy(() =>
  import("../features/analytics/examiner/OrgDashboard").then((m) => ({
    default: m.OrgDashboard,
  })));

export function DashboardPage() {
  return (
    // The chunk spinner is the one thing on this route that renders before OrgDashboard
    // exists, so it carries its own Bengali label — a bare <Spin/> announces nothing. The
    // label is a sibling, not Spin's `tip`: antd only honours `tip` in the nest pattern
    // (Spin wrapping children) and warns to the console otherwise.
    <Suspense
      fallback={
        <div role="status" style={{ textAlign: "center", margin: "48px auto" }}>
          <Spin />
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--ex-ink-soft)" }}>
            ড্যাশবোর্ড লোড হচ্ছে…
          </div>
        </div>
      }
    >
      <OrgDashboard />
    </Suspense>
  );
}
