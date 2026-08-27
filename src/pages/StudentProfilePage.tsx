import { useState } from "react";
import {
  Button,
  Collapse,
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
import { bnMoney, bnNum } from "../lib/bn";
import { formatDhakaShortBn } from "../lib/format";
import { lookup } from "../lib/lookup";
import type { ThemeMode } from "../theme/tokens";
import { PageContainer } from "../ui/PageContainer";
import { NameSection } from "../features/account/NameSection";
import { PhoneSection } from "../features/account/PhoneSection";
import { EmailSection } from "../features/account/EmailSection";
import { PasswordSection } from "../features/account/PasswordSection";
import { SessionsSection } from "../features/account/SessionsSection";

// Order status → { antd Tag color, Bangla label } (business plan order lifecycle).
// `duplicate` (Phase 10 D6) is the gateway settling the same intent twice: the buyer already
// has the entitlement, so the second charge is money the platform owes back. Amber, not red —
// nothing went wrong for the student, and the label says what happens next rather than naming
// the internal state.
const ORDER_STATUS: Record<string, { color: string; label: string }> = {
  paid: { color: "green", label: "সম্পন্ন" },
  pending: { color: "gold", label: "চলমান" },
  failed: { color: "red", label: "ব্যর্থ" },
  voided: { color: "default", label: "বাতিল" },
  duplicate: { color: "orange", label: "ডুপ্লিকেট — ফেরত দেওয়া হবে" },
};

function OrdersHistory() {
  const orders = useMyOrders();
  if (orders.isPending) return <Spin />;
  const items = orders.data?.items ?? [];
  if (items.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="কোনো অর্ডার নেই" />;
  }
  return (
    <List
      dataSource={items}
      renderItem={(o) => {
        // Through `lookup`, not `ORDER_STATUS[o.status]`: a wire status of "constructor"
        // resolves through Object.prototype to a function, which `??` keeps and React then
        // throws on (lib/lookup.ts). The `?? {…}` fallback is unchanged — an unreadable state
        // prints itself in the neutral colour.
        const s = lookup(ORDER_STATUS, o.status) ?? { color: "default", label: o.status };
        return (
          <List.Item>
            <Space orientation="vertical" size={2} style={{ width: "100%" }}>
              <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
                <Typography.Text strong>{o.productTitle}</Typography.Text>
                <Tag color={s.color}>{s.label}</Tag>
              </Space>
              <Space wrap>
                <Typography.Text>{bnMoney(o.amountBdt)}</Typography.Text>
                <Typography.Text type="secondary">{formatDhakaShortBn(o.createdAt)}</Typography.Text>
              </Space>
              {/* Prices are VAT-INCLUSIVE (D5): this line breaks the amount above down, it never
                  adds to it — hence «অন্তর্ভুক্ত». Only on a settled order, and only when the
                  order actually carries a stamp: orders minted before Phase 10 have vatBdt 0,
                  and «ভ্যাট ৳০ (০%) অন্তর্ভুক্ত» is a claim about tax we did not collect. */}
              {o.status === "paid" && o.vatBdt > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ভ্যাট {bnMoney(o.vatBdt)} ({bnNum(o.vatRatePercent)}%) অন্তর্ভুক্ত
                </Typography.Text>
              )}
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

  if (!user) return null;

  return (
    <PageContainer>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <Typography.Title level={3} style={{ color: "var(--ex-ink)" }}>
          প্রোফাইল
        </Typography.Title>

        <NameSection user={user} />
        <Divider />
        <PhoneSection user={user} />
        <Divider />
        <Collapse
          ghost
          items={[
            {
              key: "email",
              label: (
                <Typography.Text strong style={{ color: "var(--ex-ink)" }}>
                  ইমেইল (ঐচ্ছিক)
                </Typography.Text>
              ),
              children: <EmailSection user={user} bare />,
            },
          ]}
        />
        <Divider />
        <PasswordSection user={user} />
        <Divider />
        <SessionsSection />
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
          <Button block onClick={() => navigate("/onboarding")}>
            প্রতিষ্ঠান হিসেবে যোগ দিন
          </Button>
          <Button danger block onClick={onLogout}>
            লগআউট
          </Button>
        </Space>
      </div>
    </PageContainer>
  );
}
