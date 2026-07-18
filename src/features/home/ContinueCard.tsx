import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import type { HomeContinue } from "../../api/types";

// resume attempts always live on an exam lobby; "next" can be either kind.
function lobbyPath(card: HomeContinue): string {
  if (card.type === "resume") return `/student/exams/${card.id}`;
  return card.kind === "exam"
    ? `/student/exams/${card.id}`
    : `/student/model-tests/${card.id}`;
}

export function ContinueCard({ card }: { card: HomeContinue | null }) {
  const navigate = useNavigate();
  if (!card) return null;

  const isResume = card.type === "resume";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--ex-teal-tint-2)",
        background: "var(--ex-teal-tint)",
      }}
    >
      <Typography.Text style={{ fontSize: 13, fontWeight: 600, color: "var(--ex-teal-ink)" }}>
        {isResume ? "চালিয়ে যাও" : "পরের টেস্ট"}
      </Typography.Text>
      <Typography.Text strong ellipsis style={{ fontSize: 16, color: "var(--ex-ink)" }}>
        {card.title}
      </Typography.Text>
      <Button
        type="primary"
        style={{ alignSelf: "flex-start", marginTop: 4 }}
        onClick={() => navigate(lobbyPath(card))}
      >
        {isResume ? "আবার শুরু" : "শুরু করি"}
      </Button>
    </div>
  );
}
