import { App, Button, Card, Form, Input, InputNumber, Modal, Select, Skeleton, Space, Table, Tag } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminPapers, useCreatePaper } from "../api/qbankAdmin";
import type { AdminPaper } from "../api/types";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";
import { count, formatDhakaDateTimeEn } from "../lib/format";
import { lookup } from "../lib/lookup";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";
import { CONTENT_STATUS_COLORS } from "../theme/status";

const PAGE_SIZE = 20;

// D1 keeps this body English, so the antd `Tag` stays (its text is the English word) rather
// than moving to `ui/StatusChip`'s ContentStatusChip, whose labels are Bengali by design.
// This page and the paper page one route down are the last two consumers of
// CONTENT_STATUS_COLORS; the map dies with them, not in this task.
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  published: "Published",
  archived: "Archived",
};

type CreateFormValues = { title?: string; year?: number; categoryId?: string };

export function AdminQbankPage() {
  const navigate = useNavigate();
  // AppShell mounts antd's `App` inside the admin ConfigProvider; the imported statics render
  // into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();

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

  // `total` is the FILTERED total the server reports, so the line answers "how many papers am
  // I looking at" and not "how many exist" — which is what a header above a filtered table is
  // read as. Singular guarded (`count`): a year filter routinely narrows this to one paper.
  const summary =
    papersQ.data == null ? undefined : count(papersQ.data.total, "paper", "papers");

  return (
    <>
      <PageHeader
        title="Question bank"
        summary={summary}
        actions={
          <PillButton variant="primary" onClick={openCreate}>
            Add paper
          </PillButton>
        }
      />

      {/* The filter row lives ABOVE the three-state branch, and that placement is load-bearing
          (the same reason OrdersPage keeps its search Card outside its branch): every filter
          change is a NEW query key and `useAdminPapers` holds no previous data, so the branch
          swings to `isPending` on each edit. With the controls inside it they UNMOUNT — typing
          the fourth digit of a year blanked the field and dropped focus mid-edit. Only the
          table is allowed to be replaced by the skeleton. */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
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
            className="ex-num"
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
      </Card>

      {/* The house three-state shape (see ui/RetryNotice). The branch keys on `!data`, never
          `isError`: TanStack keeps `data` through a same-key refetch failure, so a page of
          papers we already hold stays on screen under the strip. A filter or page change is a
          NEW query key and lands in the pending branch, which is what the skeleton is for.
          Copy is English throughout (D1). */}
      {papersQ.isPending ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !papersQ.data ? (
        <RetryNotice
          tone="panel"
          busy={papersQ.isFetching}
          onRetry={() => void papersQ.refetch()}
          message="Couldn't load the question bank."
          retryLabel="Try again"
        />
      ) : (
        <Card>
          {papersQ.isError && (
            <RetryNotice
              tone="strip"
              busy={papersQ.isFetching}
              onRetry={() => void papersQ.refetch()}
              message="Couldn't refresh — showing the previous data."
              retryLabel="Try again"
            />
          )}

          <Table<AdminPaper>
            rowKey="id"
            dataSource={papersQ.data.items}
            locale={{ emptyText: "No papers match these filters." }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: papersQ.data.total,
              onChange: setPage,
              showSizeChanger: false,
            }}
            columns={[
              { title: "Title", dataIndex: "title" },
              { title: "Year", dataIndex: "year", width: 100, align: "right", className: "ex-num" },
              {
                title: "Status", dataIndex: "status", width: 120,
                render: (s: string) => (
                  <Tag color={lookup(CONTENT_STATUS_COLORS, s) ?? "default"}>
                    {lookup(STATUS_LABEL, s) ?? s}
                  </Tag>
                ),
              },
              {
                title: "Questions", dataIndex: "questionCount", width: 120,
                align: "right", className: "ex-num",
              },
              {
                title: "Updated", dataIndex: "updatedAt", width: 200, className: "ex-num",
                // Was `toLocaleString()` — the reader's own locale AND timezone, so an admin
                // abroad read a paper's last edit at a different wall clock than the person who
                // made it. Dhaka-pinned English now (T5's formatter). `|| "—"`: the formatter
                // returns "" on an unparseable instant (house convention — the caller decides
                // what to print instead), and an empty cell reads as "never updated".
                render: (v: string) => (
                  <span style={{ whiteSpace: "nowrap" }}>{formatDhakaDateTimeEn(v) || "—"}</span>
                ),
              },
              {
                title: "Actions", key: "actions", width: 100,
                render: (_, record) => (
                  <Button size="small" onClick={() => navigate(`/admin/qbank/${record.id}`)}>
                    Open
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* `forceRender` + explicit ok/cancel text: the form instance is seeded before the modal
          first opens (antd would otherwise warn about an unconnected `useForm` instance), and
          AppShell's ConfigProvider carries antd's bn_BD locale, so an un-passed cancel button
          prints «বাতিল» in the middle of an English page. */}
      <Modal
        open={modalOpen}
        forceRender
        title="Add paper"
        okText="Create"
        cancelText="Cancel"
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createPaper.isPending}
      >
        <Form<CreateFormValues> form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="e.g. BCS 45th Preliminary" />
          </Form.Item>
          <Form.Item name="year" label="Year" rules={[{ required: true, message: "Year is required" }]}>
            <InputNumber min={1970} max={2100} className="ex-num" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: "Category is required" }]}>
            <CategoryTreeSelect placeholder="Select a category" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
