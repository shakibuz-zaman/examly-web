import { Alert, Button, Skeleton, Typography, message } from "antd";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useStudentHome } from "../api/student";
import { useStartPractice } from "../api/practice";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { LiveRail } from "../features/home/LiveRail";
import { ContinueCard } from "../features/home/ContinueCard";
import { StreakStrip } from "../features/home/StreakStrip";
import { PracticeCard } from "../features/home/PracticeCard";
import { PageContainer } from "../ui/PageContainer";

export function StudentHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeTrackId } = useActiveTrack();
  const home = useStudentHome(activeTrackId);
  const start = useStartPractice();

  const greeting = user?.name ? `স্বাগতম, ${user.name}` : "শুভেচ্ছা!";

  // A notebook session for the second half of the repair. A 409 means the notebook is
  // empty too, so there's nothing to practice here — send the student to the qbank.
  const startNotebookRepair = () =>
    start.mutate(
      { source: "notebook", trackId: activeTrackId! },
      {
        onSuccess: (s) => navigate(`/student/practice/${s.id}`),
        onError: (err) => {
          if (err instanceof AxiosError && err.response?.status === 409) {
            navigate("/student/qbank");
          } else {
            message.error("প্র্যাকটিস শুরু করা যায়নি");
          }
        },
      },
    );

  // Repair needs TWO completed practice sessions today (spec §8.2); this CTA just gets
  // the *next* session going — the strip copy explains the double requirement. Try the
  // daily set first; if today's daily is already completed the POST returns that finished
  // session (completedAt set), and a 409 means the track has no daily pool — either way,
  // fall back to a notebook session.
  const startRepairPractice = () =>
    start.mutate(
      { source: "daily", trackId: activeTrackId! },
      {
        onSuccess: (s) => {
          if (s.completedAt == null) navigate(`/student/practice/${s.id}`);
          else startNotebookRepair();
        },
        onError: (err) => {
          if (err instanceof AxiosError && err.response?.status === 409) {
            startNotebookRepair();
          } else {
            message.error("প্র্যাকটিস শুরু করা যায়নি");
          }
        },
      },
    );

  // activeTrackId null = tracks still resolving; query is disabled, so show skeletons.
  const loading = activeTrackId == null || home.isLoading;

  return (
    <PageContainer>
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
            title="হোম লোড করা যায়নি"
            action={
              <Button size="small" onClick={() => home.refetch()}>
                আবার চেষ্টা করুন
              </Button>
            }
          />
        ) : (
          <>
            <StreakStrip
              streak={home.data?.streak ?? null}
              onRepair={startRepairPractice}
              repairing={start.isPending}
            />

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
    </PageContainer>
  );
}
