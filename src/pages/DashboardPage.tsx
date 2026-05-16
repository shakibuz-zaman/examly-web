import { Button, Card, Descriptions, Typography } from "antd";
import { useAuth } from "../auth/useAuth";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <Card style={{ maxWidth: 720, margin: "40px auto" }}>
      <Typography.Title level={3}>Dashboard</Typography.Title>
      <Descriptions column={1} bordered>
        <Descriptions.Item label="User ID">{user?.sub}</Descriptions.Item>
        <Descriptions.Item label="Email">{user?.email ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Role">{user?.role}</Descriptions.Item>
        <Descriptions.Item label="Org ID">{user?.orgId ?? "—"}</Descriptions.Item>
      </Descriptions>
      <Button danger style={{ marginTop: 16 }} onClick={logout}>
        Logout
      </Button>
    </Card>
  );
}
