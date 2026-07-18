import { Button, Typography } from "antd";
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

export function StreakStrip({
  streak,
  onRepair,
}: {
  streak: HomeStreak | null;
  onRepair: () => void;
}) {
  // The API always sends the block in 7b; the null guard is only for the frozen seam.
  if (!streak) return null;

  // Server-computed (repair window is a server concern) — the strip stays pure: no
  // dayjs()/Date.now() in render, so it renders identically for a given prop.
  const repairable = streak.repairable;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
          <Button
            size="small"
            type="link"
            style={{ marginLeft: "auto", padding: 0 }}
            onClick={onRepair}
          >
            স্ট্রিক ফিরিয়ে আনুন
          </Button>
        )}
      </div>
      {repairable && (
        <Typography.Text style={{ fontSize: 12, color: "var(--ex-ink-soft)" }}>
          আজ ২টি প্র্যাকটিস সেশন শেষ করলে স্ট্রিক ফিরে আসবে
        </Typography.Text>
      )}
    </div>
  );
}
