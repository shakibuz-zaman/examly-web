import { Button, Card, Form, Input, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useCreateMyOrg, useMyOrg } from "../api/me";
import type { CreateOrgRequest } from "../api/types";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { data: existing } = useMyOrg();
  const create = useCreateMyOrg();

  useEffect(() => {
    if (existing) navigate("/dashboard", { replace: true });
  }, [existing, navigate]);

  async function onFinish(values: CreateOrgRequest) {
    try {
      await create.mutateAsync(values);
      message.success("Organization created");
      navigate("/dashboard");
    } catch {
      message.error("Failed to create organization");
    }
  }

  return (
    <Card style={{ maxWidth: 560, margin: "80px auto" }}>
      <Typography.Title level={3}>Welcome to Examly</Typography.Title>
      <Typography.Paragraph type="secondary">
        Tell us about your organization. You can edit these details later.
      </Typography.Paragraph>
      <Form<CreateOrgRequest> layout="vertical" onFinish={onFinish} disabled={create.isPending}>
        <Form.Item name="name" label="Organization name" rules={[{ required: true, max: 120 }]}>
          <Input placeholder="Acme BCS Academy" />
        </Form.Item>
        <Form.Item name="contactEmail" label="Contact email" rules={[{ required: true, type: "email", max: 200 }]}>
          <Input placeholder="contact@acme.test" />
        </Form.Item>
        <Form.Item name="description" label="Short description (optional)" rules={[{ max: 2000 }]}>
          <Input.TextArea rows={3} placeholder="What kind of tests do you publish?" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={create.isPending} block>
          Create organization
        </Button>
      </Form>
    </Card>
  );
}
