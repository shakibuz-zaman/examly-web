import { Alert, Button, Skeleton, Typography } from "antd";
import { useAuth } from "../auth/useAuth";
import { useStudentHome } from "../api/student";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { LiveRail } from "../features/home/LiveRail";
import { ContinueCard } from "../features/home/ContinueCard";
import { StreakStrip } from "../features/home/StreakStrip";
import { PracticeCard } from "../features/home/PracticeCard";

export function StudentHomePage() {
  const { user } = useAuth();
  const { activeTrackId } = useActiveTrack();
  const home = useStudentHome(activeTrackId);

  const greeting = user?.name ? `স্বাগতম, ${user.name}` : "শুভেচ্ছা!";

  // activeTrackId null = tracks still resolving; query is disabled, so show skeletons.
  const loading = activeTrackId == null || home.isLoading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Typography.Title level={3} style={{ margin: 0, color: "var(--ex-ink)" }}>
        {greeting}
      </Typography.Title>

      {loading ? (
        <>
          <Skeleton active />
          <Skeleton active />
          <Skeleton active />
        </>
      ) : home.isError ? (
        <Alert
          type="error"
          showIcon
          message="হোম লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => home.refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      ) : (
        <>
          <StreakStrip streak={home.data?.streak ?? null} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Typography.Title level={5} style={{ margin: 0, color: "var(--ex-ink)" }}>
              আসন্ন লাইভ
            </Typography.Title>
            <LiveRail items={home.data?.liveRail ?? []} />
          </div>

          <ContinueCard card={home.data?.continueCard ?? null} />
          <PracticeCard practice={home.data?.practice ?? null} />
        </>
      )}
    </div>
  );
}
