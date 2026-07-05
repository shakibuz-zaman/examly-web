import { Button, Card, Descriptions, Form, Input, Modal, Typography, message } from "antd";
import { useState } from "react";
import { useMyOrg, useUpdateMyOrg } from "../api/me";
import type { UpdateOrgRequest } from "../api/types";
import { MediaUploader } from "../features/media/MediaUploader";

export function OrgProfilePage() {
  const { data: org } = useMyOrg();
  const update = useUpdateMyOrg();
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm<UpdateOrgRequest>();

  if (!org) return null;

  async function onSave(values: UpdateOrgRequest) {
    try {
      await update.mutateAsync(values);
      message.success("Saved");
      setEditing(false);
    } catch {
      message.error("Update failed");
    }
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Organization profile</Typography.Title>}
      extra={<Button onClick={() => {
        form.setFieldsValue({
          name: org.name,
          contactEmail: org.contactEmail,
          description: org.description ?? undefined,
        });
        setEditing(true);
      }}>Edit</Button>}
      style={{ maxWidth: 800 }}
    >
      <Descriptions column={1} bordered size="middle">
        <Descriptions.Item label="Name">{org.name}</Descriptions.Item>
        <Descriptions.Item label="Contact email">{org.contactEmail}</Descriptions.Item>
        <Descriptions.Item label="Description">{org.description ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="Logo">
          <MediaUploader
            value={org.logoMediaId ?? null}
            onChange={async (mediaId) => {
              try {
                await update.mutateAsync({ logoMediaId: mediaId ?? "" });
                message.success(mediaId ? "Logo updated" : "Logo removed");
              } catch {
                message.error("Failed to update logo");
              }
            }}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Status">{org.status}</Descriptions.Item>
        <Descriptions.Item label="Currency">{org.defaultCurrency}</Descriptions.Item>
        <Descriptions.Item label="Created">{new Date(org.createdAt).toLocaleString()}</Descriptions.Item>
      </Descriptions>

      <Modal
        open={editing}
        onCancel={() => setEditing(false)}
        onOk={() => form.submit()}
        confirmLoading={update.isPending}
        title="Edit organization"
      >
        <Form<UpdateOrgRequest> form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="name" label="Name" rules={[{ required: true, max: 120 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactEmail" label="Contact email" rules={[{ required: true, type: "email", max: 200 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ max: 2000 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
