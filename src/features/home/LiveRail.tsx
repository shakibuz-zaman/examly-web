import { Button, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Illustration } from "../../components/Illustration";
import { useRegister } from "../../api/commerce";
import type { HomeLiveItem } from "../../api/types";

function lobbyPath(item: HomeLiveItem): string {
  return item.kind === "exam"
    ? `/student/exams/${item.id}`
    : `/student/model-tests/${item.id}`;
}

function LiveCard({ item }: { item: HomeLiveItem }) {
  const navigate = useNavigate();
  const register = useRegister();
  const isLive = item.state === "live";
  const goToLobby = () => navigate(lobbyPath(item));

  // One-tap register only where the listing (and price) is known. A null listing/price is a
  // public-default rail item — it carries no commercial affordance.
  const isFree = item.priceBdt === 0;
  const isPaid = item.priceBdt != null && item.priceBdt > 0;

  function onRegister(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.listingId) return;
    register.mutate(item.listingId, {
      onError: (err) => {
        const msg = err instanceof AxiosError ? err.response?.data?.error : undefined;
        message.error(msg ?? "রেজিস্টার করা যায়নি");
      },
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToLobby}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToLobby();
        }
      }}
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {isLive ? <Tag color="red">LIVE চলছে</Tag> : <Tag>আসছে</Tag>}
        {item.registered && <Tag color="cyan">রেজিস্টার্ড</Tag>}
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
      {item.registeredCount > 0 && (
        <Typography.Text style={{ fontSize: 12, color: "var(--ex-ink-soft)" }}>
          {item.registeredCount} জন রেজিস্টার করেছে
        </Typography.Text>
      )}
      {!item.registered && item.listingId && isFree && (
        <Button size="small" ghost loading={register.isPending} onClick={onRegister}>
          রেজিস্টার
        </Button>
      )}
      {!item.registered && item.listingId && isPaid && (
        <Button
          size="small"
          type="primary"
          onClick={(e) => {
            e.stopPropagation();
            goToLobby();
          }}
        >
          ৳{item.priceBdt}
        </Button>
      )}
    </div>
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
