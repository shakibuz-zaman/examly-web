import { Alert, Button, Grid, Spin } from "antd";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMyTracks } from "../api/me";
import { AppHeader } from "../ui/AppHeader";
import { BottomTabBar } from "../ui/BottomTabBar";
import { TrackProvider } from "../features/tracks/TrackContext";

const centeredSpin = (
  <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
    <Spin />
  </div>
);

export function StudentShell() {
  const location = useLocation();
  const onOnboarding = location.pathname.endsWith("/onboarding");
  const onTakeRoute =
    /\/exams\/[^/]+\/take$/.test(location.pathname) ||
    /^\/student\/practice\/[^/]+$/.test(location.pathname);
  const myTracks = useMyTracks();

  // Onboarding and the exam runner render bare (no chrome, no bottom tab bar) so
  // those flows own the full viewport.
  if (onOnboarding || onTakeRoute) return <Outlet />;

  // Wait for the subscription list before deciding — never redirect on a stale/empty load.
  // isPending, NOT isLoading (= isPending && isFetching): on a cold start with no
  // connectivity the query is born PAUSED, so isLoading is false with no data — and this
  // guard would fall through to the empty-subscription redirect below. The query has no
  // enable gate, so pending only ever means "still loading".
  if (myTracks.isPending) return centeredSpin;
  // A failed load must NOT be read as "no tracks" (that would bounce a subscribed
  // student to onboarding). Surface the error with a retry instead.
  if (myTracks.isError) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 16px" }}>
        <Alert
          type="error"
          showIcon
          title="ট্র্যাক লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => myTracks.refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      </div>
    );
  }
  // Only redirect on a confirmed empty subscription (successful load, zero tracks).
  if (myTracks.data && myTracks.data.trackIds.length === 0) {
    return <Navigate to="/student/onboarding" replace />;
  }

  return (
    <TrackProvider>
      <ShellChrome />
    </TrackProvider>
  );
}

function ShellChrome() {
  const isDesktop = Grid.useBreakpoint().md;
  return (
    <div style={{ minHeight: "100vh", background: "var(--ex-bg)" }}>
      <AppHeader />
      <main>
        <Outlet />
      </main>
      {!isDesktop && <BottomTabBar />}
    </div>
  );
}
