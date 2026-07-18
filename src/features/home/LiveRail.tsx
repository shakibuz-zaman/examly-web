import { Tag, Typography } from "antd";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import { Illustration } from "../../components/Illustration";
import type { HomeLiveItem } from "../../api/types";

function lobbyPath(item: HomeLiveItem): string {
  return item.kind === "exam"
    ? `/student/exams/${item.id}`
    : `/student/model-tests/${item.id}`;
}

function LiveCard({ item }: { item: HomeLiveItem }) {
  const navigate = useNavigate();
  const isLive = item.state === "live";
  return (
    <button
      type="button"
      onClick={() => navigate(lobbyPath(item))}
      style={{
        flex: "0 0 auto",
        width: 240,
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        borderRadius: 12,
        border: `1px solid ${isLive ? "var(--ex-red)" : "var(--ex-line)"}`,
        background: "var(--ex-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isLive ? <Tag color="red">LIVE চলছে</Tag> : <Tag>আসছে</Tag>}
        <span className="tnum" style={{ fontSize: 12, color: "var(--ex-ink-soft)" }}>
          {dayjs(item.windowStartUtc).format("D MMM, h:mm A")}
        </span>
      </div>
      <Typography.Text strong ellipsis style={{ color: "var(--ex-ink)" }}>
        {item.title}
      </Typography.Text>
      {item.orgName && (
        <Typography.Text ellipsis style={{ fontSize: 13, color: "var(--ex-ink-soft)" }}>
          {item.orgName}
        </Typography.Text>
      )}
    </button>
  );
}

export function LiveRail({ items }: { items: HomeLiveItem[] }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "24px 16px",
          borderRadius: 12,
          border: "1px solid var(--ex-line)",
          background: "var(--ex-card)",
        }}
      >
        <Illustration name="empty" />
        <Typography.Text style={{ color: "var(--ex-ink-soft)", textAlign: "center" }}>
          এই ট্র্যাকে এখন কোনো লাইভ পরীক্ষা নেই
        </Typography.Text>
        <Link to="/student/tests" style={{ color: "var(--ex-teal-ink)", fontWeight: 500 }}>
          মডেল টেস্ট দেখুন
        </Link>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", overflowX: "auto", gap: 12, paddingBottom: 4 }}>
      {items.map((item) => (
        <LiveCard key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
