import { Button, Typography } from "antd";
import dayjs from "dayjs";
import { bnNum } from "../../lib/bn";
import type { HomeStreak } from "../../api/types";

const stripStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid var(--ex-line)",
  background: "var(--ex-card)",
};

export function StreakStrip({ streak }: { streak: HomeStreak | null }) {
  // 7a always sends null; this is the "coming soon" seam.
  if (!streak) {
    return (
      <div style={stripStyle}>
        <span aria-hidden="true" style={{ fontSize: 18, opacity: 0.6 }}>🔥</span>
        <Typography.Text style={{ color: "var(--ex-ink-soft)" }}>
          স্ট্রিক শীঘ্রই আসছে
        </Typography.Text>
      </div>
    );
  }

  const repairable =
    streak.repairableUntilUtc != null && dayjs(streak.repairableUntilUtc).isAfter(dayjs());

  return (
    <div style={stripStyle}>
      <span aria-hidden="true" style={{ fontSize: 18 }}>🔥</span>
      <Typography.Text strong style={{ color: "var(--ex-ink)" }}>
        {bnNum(streak.current)} দিনের স্ট্রিক
      </Typography.Text>
      {streak.freezesBanked > 0 && (
        <Typography.Text style={{ color: "var(--ex-ink-soft)" }}>
          {"❄".repeat(streak.freezesBanked)}
        </Typography.Text>
      )}
      {repairable && (
        <Button size="small" type="link" style={{ marginLeft: "auto", padding: 0 }}>
          স্ট্রিক ফিরিয়ে আনুন
        </Button>
      )}
    </div>
  );
}
