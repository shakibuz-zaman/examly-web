import { useState } from "react";
import { Button, Typography, message } from "antd";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { Illustration } from "../components/Illustration";
import { useSaveMyTracks } from "../api/me";
import { TrackPicker } from "../features/tracks/TrackPicker";

export function StudentOnboardingPage() {
  const navigate = useNavigate();
  const save = useSaveMyTracks();
  const [selected, setSelected] = useState<string[]>([]);

  async function onStart() {
    try {
      await save.mutateAsync(selected);
      navigate("/student/home", { replace: true });
    } catch (e) {
      const msg = e instanceof AxiosError ? e.response?.data?.error : undefined;
      message.error(msg ?? "সংরক্ষণ ব্যর্থ হয়েছে");
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 96px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Illustration name="lobby" />
        <Typography.Title level={3} style={{ margin: "12px 0 4px", color: "var(--ex-ink)" }}>
          কোন পথে এগোচ্ছ?
        </Typography.Title>
        <Typography.Paragraph style={{ margin: 0, color: "var(--ex-ink-soft)" }}>
          একাধিক নির্বাচন করা যাবে — পরে বদলানোও যাবে
        </Typography.Paragraph>
      </div>

      <TrackPicker value={selected} onChange={setSelected} />

      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 24,
          paddingTop: 12,
          background: "var(--ex-bg)",
        }}
      >
        <Button
          type="primary"
          size="large"
          block
          disabled={selected.length === 0}
          loading={save.isPending}
          onClick={onStart}
        >
          শুরু করি
        </Button>
      </div>
    </div>
  );
}
