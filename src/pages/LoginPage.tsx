import { Button, Card, Form, Input, Select, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/useAuth";

type FormValues = {
  sub: string;
  email: string;
  role: "platform_admin" | "examiner" | "student";
  orgId?: string;
};

export function LoginPage() {
  const { setToken } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(values: FormValues) {
    try {
      const { data } = await apiClient.post<{ token: string }>("/api/v1/dev/issue-token", values);
      setToken(data.token);
      message.success("Logged in");
      navigate("/dashboard");
    } catch {
      message.error("Token issuance failed");
    }
  }

  return (
    <Card style={{ maxWidth: 480, margin: "80px auto" }}>
      <Typography.Title level={3}>Examly — Dev Login</Typography.Title>
      <Typography.Paragraph type="secondary">
        This screen issues a stub JWT via the dev-only endpoint. The real Identity service will replace it later.
      </Typography.Paragraph>
      <Form<FormValues> layout="vertical" onFinish={onSubmit} initialValues={{ role: "examiner" }}>
        <Form.Item name="sub" label="User ID (sub)" rules={[{ required: true }]}>
          <Input placeholder="user-1" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
          <Input placeholder="u@example.com" />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "platform_admin", label: "Platform Admin" },
              { value: "examiner", label: "Examiner" },
              { value: "student", label: "Student" },
            ]}
          />
        </Form.Item>
        <Form.Item name="orgId" label="Org ID (examiners only)">
          <Input placeholder="org-1" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Issue token and continue
        </Button>
      </Form>
    </Card>
  );
}
