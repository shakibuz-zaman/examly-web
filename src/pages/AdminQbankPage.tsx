import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminPapers, useCreatePaper } from "../api/qbankAdmin";
import type { AdminPaper } from "../api/types";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";
import { formatDateTime } from "../lib/format";
import { CONTENT_STATUS_COLORS } from "../theme/status";

const PAGE_SIZE = 20;

type CreateFormValues = { title?: string; year?: number; categoryId?: string };

export function AdminQbankPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const papersQ = useAdminPapers({ status, year, categoryId, page, pageSize: PAGE_SIZE });
  const createPaper = useCreatePaper();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  function openCreate() {
    form.resetFields();
    form.setFieldsValue({ year: new Date().getFullYear() });
    setModalOpen(true);
  }

  async function onSubmit(values: CreateFormValues) {
    try {
      const paper = await createPaper.mutateAsync({
        title: values.title!.trim(),
        year: values.year!,
        categoryId: values.categoryId!,
      });
      message.success("Paper created");
      setModalOpen(false);
      form.resetFields();
      navigate(`/admin/qbank/${paper.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? "Create failed");
    }
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Question Bank</Typography.Title>}
      extra={<Button type="primary" onClick={openCreate}>Add paper</Button>}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={status ?? "all"}
          style={{ width: 160 }}
          onChange={(v) => {
            setStatus(v === "all" ? undefined : v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <InputNumber
          placeholder="Year"
          style={{ width: 120 }}
          value={year}
          min={1970}
          max={2100}
          onChange={(v) => {
            setYear(v ?? undefined);
            setPage(1);
          }}
        />
        <div style={{ width: 260 }}>
          <CategoryTreeSelect
            placeholder="All categories"
            value={categoryId ?? null}
            onChange={(id) => {
              setCategoryId(id ?? undefined);
              setPage(1);
            }}
          />
        </div>
      </Space>

      <Table<AdminPaper>
        rowKey="id"
        loading={papersQ.isLoading}
        dataSource={papersQ.data?.items ?? []}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: papersQ.data?.total ?? 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: "Title", dataIndex: "title" },
          {
            title: "Year", dataIndex: "year", width: 100,
            render: (y: number) => <span className="tnum">{y}</span>,
          },
          {
            title: "Status", dataIndex: "status", width: 120,
            render: (s: string) => <Tag color={CONTENT_STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
          },
          {
            title: "Questions", dataIndex: "questionCount", width: 120,
            render: (n: number) => <span className="tnum">{n}</span>,
          },
          {
            title: "Updated", dataIndex: "updatedAt", width: 200,
            render: (v: string) => formatDateTime(v),
          },
          {
            title: "Actions", key: "actions", width: 100,
            render: (_, record) => (
              <Button size="small" onClick={() => navigate(`/admin/qbank/${record.id}`)}>Open</Button>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title="Add paper"
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createPaper.isPending}
      >
        <Form<CreateFormValues> form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="e.g. BCS 45th Preliminary" />
          </Form.Item>
          <Form.Item name="year" label="Year" rules={[{ required: true, message: "Year is required" }]}>
            <InputNumber min={1970} max={2100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: "Category is required" }]}>
            <CategoryTreeSelect placeholder="Select a category" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
