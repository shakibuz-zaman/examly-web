import { useState } from "react";
import {
  Button,
  Collapse,
  Descriptions,
  Divider,
  Empty,
  List,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useMyTracks, useSaveMyTracks } from "../api/me";
import { useMyOrders } from "../api/commerce";
import { useThemeMode } from "../theme/ThemeContext";
import { TrackPicker } from "../features/tracks/TrackPicker";
import { formatDateTime } from "../lib/format";
import type { ThemeMode } from "../theme/tokens";

// Order status → { antd Tag color, Bangla label } (business plan order lifecycle).
const ORDER_STATUS: Record<string, { color: string; label: string }> = {
  paid: { color: "green", label: "সম্পন্ন" },
  pending: { color: "gold", label: "চলমান" },
  failed: { color: "red", label: "ব্যর্থ" },
  voided: { color: "default", label: "বাতিল" },
};

function OrdersHistory() {
  const orders = useMyOrders();
  if (orders.isLoading) return <Spin />;
  const items = orders.data?.items ?? [];
  if (items.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="কোনো অর্ডার নেই" />;
  }
  return (
    <List
      dataSource={items}
      renderItem={(o) => {
        const s = ORDER_STATUS[o.status] ?? { color: "default", label: o.status };
        return (
          <List.Item>
            <Space orientation="vertical" size={2} style={{ width: "100%" }}>
              <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                <Typography.Text strong>{o.productTitle}</Typography.Text>
                <Tag color={s.color}>{s.label}</Tag>
              </Space>
              <Space wrap>
                <Typography.Text>৳{o.amountBdt}</Typography.Text>
                <Typography.Text type="secondary">{formatDateTime(o.createdAt)}</Typography.Text>
              </Space>
            </Space>
          </List.Item>
        );
      }}
    />
  );
}

export function StudentProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, setMode } = useThemeMode();
  const myTracks = useMyTracks();
  const save = useSaveMyTracks();
  // draft === null means "untouched" → mirror the saved subscription; editing
  // forks a local copy. Avoids seeding via an effect (react-hooks/set-state-in-effect).
  const [draft, setDraft] = useState<string[] | null>(null);
  const selected = draft ?? myTracks.data?.trackIds ?? [];

  async function onSave() {
    try {
      await save.mutateAsync(selected);
      setDraft(null); // re-sync with the invalidated server list
      message.success("ট্র্যাক আপডেট হয়েছে");
    } catch (e) {
      const msg = e instanceof AxiosError ? e.response?.data?.error : undefined;
      message.error(msg ?? "সংরক্ষণ ব্যর্থ হয়েছে");
    }
  }

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <Typography.Title level={3} style={{ color: "var(--ex-ink)" }}>
        প্রোফাইল
      </Typography.Title>

      <Descriptions column={1} bordered size="small" style={{ marginTop: 8 }}
        items={[{ key: "name", label: "নাম", children: user?.name ?? "—" }]}
      />

      <Divider />

      <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
        থিম
      </Typography.Title>
      <Segmented
        value={mode}
        onChange={(v) => setMode(v as ThemeMode)}
        options={[
          { label: "লাইট", value: "light" },
          { label: "ডার্ক", value: "dark" },
        ]}
      />

      <Divider />

      <Typography.Title level={5} style={{ color: "var(--ex-ink)" }}>
        ট্র্যাক পরিবর্তন
      </Typography.Title>
      <Typography.Paragraph style={{ color: "var(--ex-ink-soft)" }}>
        একাধিক নির্বাচন করা যাবে
      </Typography.Paragraph>
      <TrackPicker value={selected} onChange={setDraft} />
      <Button
        type="primary"
        block
        size="large"
        style={{ marginTop: 16 }}
        disabled={selected.length === 0}
        loading={save.isPending}
        onClick={onSave}
      >
        সংরক্ষণ করুন
      </Button>

      <Divider />

      <Collapse
        ghost
        items={[
          {
            key: "orders",
            label: (
              <Typography.Text strong style={{ color: "var(--ex-ink)" }}>
                অর্ডার হিস্টরি
              </Typography.Text>
            ),
            children: <OrdersHistory />,
          },
        ]}
      />

      <Divider />

      <Space orientation="vertical" style={{ width: "100%" }}>
        <Button danger block onClick={onLogout}>
          লগআউট
        </Button>
      </Space>
    </div>
  );
}
