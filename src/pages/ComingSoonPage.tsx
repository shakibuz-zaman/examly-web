import { Typography } from "antd";
import { Illustration } from "../components/Illustration";

// Placeholder for tabs whose feature ships in a later phase (qbank, notebook).
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 16px" }}>
      <Illustration name="soon" />
      <Typography.Title level={4} style={{ margin: "16px 0 8px", color: "var(--ex-ink)" }}>
        {title}
      </Typography.Title>
      <Typography.Paragraph style={{ margin: 0, color: "var(--ex-ink-soft)" }}>
        শীঘ্রই আসছে — পরের আপডেটে এই ফিচার চালু হবে।
      </Typography.Paragraph>
    </div>
  );
}
