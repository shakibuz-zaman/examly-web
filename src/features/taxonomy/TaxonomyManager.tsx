import { Button, Card, Drawer, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import { useState } from "react";
import {
  useCreateSubject, useCreateTopic, useDeleteSubject, useDeleteTopic,
  useSubjects, useTopics, useUpdateSubject, useUpdateTopic,
} from "../../api/taxonomy";
import type { BilingualText, SubjectResponse, TopicResponse } from "../../api/types";

type Mode = "examiner" | "admin";

type SubjectFormValues = { nameEn?: string; nameBn?: string; slug?: string };
type TopicFormValues = { nameEn?: string; nameBn?: string; slug?: string };

function toBilingual(v: { nameEn?: string; nameBn?: string }): BilingualText {
  const out: BilingualText = {};
  if (v.nameEn?.trim()) out.en = v.nameEn.trim();
  if (v.nameBn?.trim()) out.bn = v.nameBn.trim();
  return out;
}

export function TaxonomyManager({ mode }: { mode: Mode }) {
  const subjectsQ = useSubjects(mode);
  const createSubj = useCreateSubject(mode);
  const updateSubj = useUpdateSubject(mode);
  const deleteSubj = useDeleteSubject(mode);

  const [subjModalOpen, setSubjModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectResponse | null>(null);
  const [subjForm] = Form.useForm<SubjectFormValues>();

  const [drawerSubject, setDrawerSubject] = useState<SubjectResponse | null>(null);

  function canEdit(scope: "global" | "org") {
    return mode === "admin" ? scope === "global" : scope === "org";
  }

  async function onSubjectSubmit(values: SubjectFormValues) {
    const body = { name: toBilingual(values), slug: values.slug?.trim() || undefined };
    try {
      if (editingSubject) {
        await updateSubj.mutateAsync({ id: editingSubject.id, body });
        message.success("Subject updated");
      } else {
        await createSubj.mutateAsync(body);
        message.success("Subject created");
      }
      setSubjModalOpen(false);
      setEditingSubject(null);
      subjForm.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? "Save failed");
    }
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>
        {mode === "admin" ? "Global Taxonomy" : "Taxonomy"}
      </Typography.Title>}
      extra={
        <Button type="primary" onClick={() => {
          setEditingSubject(null);
          subjForm.resetFields();
          setSubjModalOpen(true);
        }}>
          {mode === "admin" ? "Add global subject" : "Add subject"}
        </Button>
      }
    >
      <Table<SubjectResponse>
        rowKey="id"
        loading={subjectsQ.isLoading}
        dataSource={subjectsQ.data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: "Name (EN)", dataIndex: ["name", "en"], render: (v?: string) => v ?? "—" },
          { title: "Name (BN)", dataIndex: ["name", "bn"], render: (v?: string) => v ?? "—" },
          { title: "Slug", dataIndex: "slug" },
          {
            title: "Scope", dataIndex: "scope",
            render: (s: "global" | "org") =>
              <Tag color={s === "global" ? "blue" : "purple"}>{s}</Tag>,
          },
          { title: "Status", dataIndex: "status" },
          {
            title: "Actions", key: "actions",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => setDrawerSubject(record)}>Topics</Button>
                {canEdit(record.scope) && (
                  <>
                    <Button size="small" onClick={() => {
                      setEditingSubject(record);
                      subjForm.setFieldsValue({
                        nameEn: record.name.en, nameBn: record.name.bn, slug: record.slug,
                      });
                      setSubjModalOpen(true);
                    }}>Edit</Button>
                    <Popconfirm
                      title="Delete subject?"
                      description="Only allowed if it has no topics."
                      onConfirm={async () => {
                        try {
                          await deleteSubj.mutateAsync(record.id);
                          message.success("Deleted");
                        } catch (e: unknown) {
                          const err = e as { response?: { data?: { error?: string } } };
                          message.error(err.response?.data?.error ?? "Delete failed");
                        }
                      }}
                    >
                      <Button size="small" danger>Delete</Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={subjModalOpen}
        title={editingSubject ? "Edit subject" : "Add subject"}
        onCancel={() => setSubjModalOpen(false)}
        onOk={() => subjForm.submit()}
        confirmLoading={createSubj.isPending || updateSubj.isPending}
      >
        <Form<SubjectFormValues> form={subjForm} layout="vertical" onFinish={onSubjectSubmit}>
          <Form.Item name="nameEn" label="Name (English)">
            <Input placeholder="e.g. Bangladesh Affairs" />
          </Form.Item>
          <Form.Item name="nameBn" label="Name (Bangla)">
            <Input placeholder="e.g. বাংলাদেশ বিষয়াবলী" />
          </Form.Item>
          <Form.Item name="slug" label="Slug (optional; derived from English if blank)">
            <Input placeholder="bangladesh-affairs" />
          </Form.Item>
        </Form>
      </Modal>

      <TopicsDrawer
        mode={mode}
        subject={drawerSubject}
        onClose={() => setDrawerSubject(null)}
        canEditScope={canEdit}
      />
    </Card>
  );
}

function TopicsDrawer({
  mode, subject, onClose, canEditScope,
}: {
  mode: Mode;
  subject: SubjectResponse | null;
  onClose: () => void;
  canEditScope: (s: "global" | "org") => boolean;
}) {
  const topicsQ = useTopics(mode, subject?.id ?? null);
  const createTopic = useCreateTopic(mode, subject?.id ?? "");
  const updateTopic = useUpdateTopic(mode, subject?.id ?? "");
  const deleteTopic = useDeleteTopic(mode, subject?.id ?? "");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicResponse | null>(null);
  const [form] = Form.useForm<TopicFormValues>();

  if (!subject) return null;

  const subjectIsEditable = canEditScope(subject.scope);

  async function onSubmit(values: TopicFormValues) {
    const body = { name: toBilingual(values), slug: values.slug?.trim() || undefined };
    try {
      if (editingTopic) {
        await updateTopic.mutateAsync({ id: editingTopic.id, body });
        message.success("Topic updated");
      } else {
        await createTopic.mutateAsync(body);
        message.success("Topic added");
      }
      setModalOpen(false);
      setEditingTopic(null);
      form.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? "Save failed");
    }
  }

  return (
    <Drawer
      open={!!subject}
      onClose={onClose}
      title={`Topics — ${subject.name.en ?? subject.name.bn ?? subject.slug}`}
      width={640}
      extra={subjectIsEditable && (
        <Button type="primary" onClick={() => {
          setEditingTopic(null); form.resetFields(); setModalOpen(true);
        }}>Add topic</Button>
      )}
    >
      <Table<TopicResponse>
        rowKey="id"
        size="small"
        loading={topicsQ.isLoading}
        dataSource={topicsQ.data ?? []}
        pagination={false}
        columns={[
          { title: "Name (EN)", dataIndex: ["name", "en"], render: (v?: string) => v ?? "—" },
          { title: "Name (BN)", dataIndex: ["name", "bn"], render: (v?: string) => v ?? "—" },
          { title: "Slug", dataIndex: "slug" },
          {
            title: "Scope", dataIndex: "scope",
            render: (s: "global" | "org") =>
              <Tag color={s === "global" ? "blue" : "purple"}>{s}</Tag>,
          },
          {
            title: "Actions", key: "actions",
            render: (_, record) =>
              canEditScope(record.scope) && (
                <Space>
                  <Button size="small" onClick={() => {
                    setEditingTopic(record);
                    form.setFieldsValue({
                      nameEn: record.name.en, nameBn: record.name.bn, slug: record.slug,
                    });
                    setModalOpen(true);
                  }}>Edit</Button>
                  <Popconfirm
                    title="Delete topic?"
                    onConfirm={async () => {
                      try { await deleteTopic.mutateAsync(record.id); message.success("Deleted"); }
                      catch { message.error("Delete failed"); }
                    }}
                  >
                    <Button size="small" danger>Delete</Button>
                  </Popconfirm>
                </Space>
              ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title={editingTopic ? "Edit topic" : "Add topic"}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createTopic.isPending || updateTopic.isPending}
      >
        <Form<TopicFormValues> form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="nameEn" label="Name (English)">
            <Input />
          </Form.Item>
          <Form.Item name="nameBn" label="Name (Bangla)">
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug (optional)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
