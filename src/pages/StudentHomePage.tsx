import { Alert, Button, message } from "antd";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useStudentHome } from "../api/student";
import { useStartPractice } from "../api/practice";
import { useActiveTrack } from "../features/tracks/TrackContext";
import { LiveRail } from "../features/home/LiveRail";
import { ContinueCard } from "../features/home/ContinueCard";
import { StreakCard } from "../features/home/StreakCard";
import { PracticeCard } from "../features/home/PracticeCard";
import { HeroBand } from "../ui/HeroBand";
import { PageContainer } from "../ui/PageContainer";
import { SectionHeader } from "../ui/SectionHeader";
import { SkeletonCard } from "../ui/Skeletons";

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
    <>
      <HeroBand
        title={greeting}
        // The goal line is the band's one job on হোম: it states today's target, or
        // retires it once the daily set is done. Until home.data lands it can say
        // NEITHER — the false branch would open every load by setting a goal the
        // student may have finished an hour ago. "—" is the placeholder মডেল টেস্ট and
        // ভুলের খাতা already use, and it has to be non-empty: HeroBand renders
        // `{subtitle && …}`, so undefined would drop the line and jump the band height.
        subtitle={
          home.data
            ? home.data.practice?.todayDone
              ? "আজকের লক্ষ্য অর্জিত ✓"
              : "আজকের লক্ষ্য: ১টি প্র্যাকটিস সেশন"
            : "—"
        }
        overlap
      />
      <PageContainer banded>
        {/* Every branch opens with .ex-band-overlap so the band's extra bottom room is
            always filled — otherwise loading and error would leave a teal gap where the
            streak card floats. */}
        {loading ? (
          <div
            className="ex-band-overlap"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : home.isError ? (
          <div className="ex-band-overlap">
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
          </div>
        ) : (
          <>
            <div className="ex-band-overlap">
              <StreakCard
                streak={home.data?.streak ?? null}
                onRepair={startRepairPractice}
                repairing={start.isPending}
              />
            </div>

            <SectionHeader label="🔴 আসন্ন লাইভ" />
            <LiveRail items={home.data?.liveRail ?? []} />

            {/* Header and card ship together: a «চালিয়ে যান» rule over nothing would
                promise a resume the student doesn't have. */}
            {home.data?.continueCard && (
              <>
                <SectionHeader label="চালিয়ে যান" />
                <ContinueCard card={home.data.continueCard} />
              </>
            )}

            {/* The callout closes the page and carries no SectionHeader of its own. */}
            <div style={{ marginTop: 16 }}>
              <PracticeCard practice={home.data?.practice ?? null} />
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}
