import { Button, Tooltip, Typography } from "antd";
import { bnNum } from "../../lib/bn";
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
  // 7a always sends null; this is the "coming soon" seam.
  if (!practice) {
    return (
      <div style={cardStyle}>
        <Typography.Text style={{ color: "var(--ex-ink-soft)" }}>
          দৈনিক প্র্যাকটিস শীঘ্রই আসছে
        </Typography.Text>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <Typography.Text strong style={{ color: "var(--ex-ink)" }}>
        দৈনিক প্র্যাকটিস
      </Typography.Text>
      {practice.dueNotebookCount > 0 && (
        <Typography.Text style={{ fontSize: 13, color: "var(--ex-ink-soft)" }}>
          ভুলের খাতায় {bnNum(practice.dueNotebookCount)}টি প্রশ্ন বাকি
        </Typography.Text>
      )}
      {practice.todayDone ? (
        <Typography.Text style={{ color: "var(--ex-green)" }}>
          আজকের প্র্যাকটিস শেষ! 🎉
        </Typography.Text>
      ) : (
        // TODO(7b): wire practice runner route
        <Tooltip title="৭বি-তে চালু হবে">
          <Button type="primary" disabled style={{ alignSelf: "flex-start" }}>
            আজকের ৫টি প্রশ্ন
          </Button>
        </Tooltip>
      )}
    </div>
  );
}
