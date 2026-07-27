import { message } from "antd";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { bnNum } from "../../lib/bn";
import { useStartPractice } from "../../api/practice";
import { useActiveTrack } from "../tracks/TrackContext";
import { PillButton } from "../../ui/PillButton";
import type { HomePractice } from "../../api/types";

// §8 আজকের প্র্যাকটিস callout — the page's closing nudge, on the teal-tint gradient.
export function PracticeCard({ practice }: { practice: HomePractice | null }) {
  const navigate = useNavigate();
  const { activeTrackId } = useActiveTrack();
  const start = useStartPractice();

  // The API always sends the block in 7b; the null guard is only for the frozen seam.
  if (!practice) return null;

  const startDaily = () =>
    start.mutate(
      { source: "daily", trackId: activeTrackId! },
      {
        onSuccess: (s) => navigate(`/student/practice/${s.id}`),
        onError: (err) => {
          // 409 = the track has no daily pool yet; point the student at the qbank.
          if (err instanceof AxiosError && err.response?.status === 409) {
            message.info("এই ট্র্যাকে এখনো প্র্যাকটিসের প্রশ্ন নেই — প্রশ্নব্যাংক দেখুন");
          } else {
            message.error("প্র্যাকটিস শুরু করা যায়নি");
          }
        },
      },
    );

  return (
    <div className="ex-callout">
      <div className="ex-callout-title">আজকের প্র্যাকটিস ✨</div>
      {practice.dueNotebookCount > 0 && (
        <div className="ex-callout-sub">
          <Link className="ex-callout-link" to="/student/notebook">
            ভুলের খাতায় {bnNum(practice.dueNotebookCount)}টি প্রশ্ন বাকি
          </Link>
        </div>
      )}
      {practice.todayDone ? (
        <div className="ex-callout-done">
          <span>আজকের প্র্যাকটিস শেষ! 🎉</span>
          <Link className="ex-callout-link" to="/student/qbank">
            আরও প্র্যাকটিস
          </Link>
        </div>
      ) : (
        // PillButton has no antd `loading`; antd's Button also swallowed clicks while
        // loading, so `disabled` keeps exactly the same double-submit guard.
        <PillButton
          className="ex-callout-cta"
          variant="primary"
          disabled={start.isPending || !activeTrackId}
          onClick={startDaily}
        >
          {start.isPending ? "শুরু হচ্ছে…" : "আজকের ৫টি প্রশ্ন"}
        </PillButton>
      )}
    </div>
  );
}
