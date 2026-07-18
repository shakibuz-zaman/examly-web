import { Button, Typography, message } from "antd";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { bnNum } from "../../lib/bn";
import { useStartPractice } from "../../api/practice";
import { useActiveTrack } from "../tracks/TrackContext";
import type { HomePractice } from "../../api/types";

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
  borderRadius: 12,
  border: "1px solid var(--ex-line)",
  background: "var(--ex-card)",
};

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
    <div style={cardStyle}>
      <Typography.Text strong style={{ color: "var(--ex-ink)" }}>
        দৈনিক প্র্যাকটিস
      </Typography.Text>
      {practice.dueNotebookCount > 0 && (
        <Link to="/student/notebook" style={{ fontSize: 13, color: "var(--ex-teal-ink)" }}>
          ভুলের খাতায় {bnNum(practice.dueNotebookCount)}টি প্রশ্ন বাকি
        </Link>
      )}
      {practice.todayDone ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Typography.Text style={{ color: "var(--ex-green)" }}>
            আজকের প্র্যাকটিস শেষ! 🎉
          </Typography.Text>
          <Link to="/student/qbank" style={{ fontSize: 13, color: "var(--ex-teal-ink)" }}>
            আরও প্র্যাকটিস
          </Link>
        </div>
      ) : (
        <Button
          type="primary"
          loading={start.isPending}
          disabled={!activeTrackId}
          onClick={startDaily}
          style={{ alignSelf: "flex-start" }}
        >
          আজকের ৫টি প্রশ্ন
        </Button>
      )}
    </div>
  );
}
