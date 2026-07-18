import { useState } from "react";
import { Button, Descriptions, Divider, Segmented, Space, Typography, message } from "antd";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useMyTracks, useSaveMyTracks } from "../api/me";
import { useThemeMode } from "../theme/ThemeContext";
import { TrackPicker } from "../features/tracks/TrackPicker";
import type { ThemeMode } from "../theme/tokens";

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

      <Space direction="vertical" style={{ width: "100%" }}>
        <Button danger block onClick={onLogout}>
          লগআউট
        </Button>
      </Space>
    </div>
  );
}
