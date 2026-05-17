import { Card, Typography } from "antd";
import { useAuth } from "../auth/useAuth";
import { useMyOrg } from "../api/me";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: org } = useMyOrg();

  return (
    <Card style={{ maxWidth: 800 }}>
      <Typography.Title level={3}>Welcome{org ? `, ${org.name}` : ""}</Typography.Title>
      <Typography.Paragraph>
        Signed in as <strong>{user?.email}</strong> ({user?.role}).
      </Typography.Paragraph>
      {org && (
        <Typography.Paragraph type="secondary">
          Your organization is active. Use the sidebar to manage your profile and (soon) your question bank, exams, and model tests.
        </Typography.Paragraph>
      )}
    </Card>
  );
}
