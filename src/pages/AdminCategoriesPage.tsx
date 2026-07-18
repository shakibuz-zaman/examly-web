import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { useMemo, useState, type Key } from "react";
import {
  buildCategoryTree, categoryLabel,
  useAdminExamCategories, useCreateExamCategory, useUpdateExamCategory,
  type CategoryKind, type CategoryNode, type ExamCategoryResponse,
} from "../api/categories";
import type { BilingualText } from "../api/types";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";

type CategoryRow = ExamCategoryResponse & { children?: CategoryRow[] };

type CategoryFormValues = {
  nameEn?: string;
  nameBn?: string;
  slug?: string;
  sortOrder?: number;
  status?: string;
  kind?: CategoryKind;
  parentCategoryId?: string | null;
};

const kindColor: Record<CategoryKind, string> = {
  section: "purple",
  track: "green",
  collection: "default",
};

function toBilingual(v: { nameEn?: string; nameBn?: string }): BilingualText {
  const out: BilingualText = {};
  if (v.nameEn?.trim()) out.en = v.nameEn.trim();
  if (v.nameBn?.trim()) out.bn = v.nameBn.trim();
  return out;
}

// antd shows an expand icon whenever the `children` key is present (even `[]`),
// so leaves must omit it entirely (mirrors the TaxonomyManager fix).
function toRows(nodes: CategoryNode[]): CategoryRow[] {
  return nodes.map(({ children, ...rest }) =>
    children.length ? { ...rest, children: toRows(children) } : rest);
}

function collectParentIds(rows: CategoryRow[]): Key[] {
  return rows.flatMap((r) => (r.children ? [r.id, ...collectParentIds(r.children)] : []));
}

export function AdminCategoriesPage() {
  const categoriesQ = useAdminExamCategories();
  const createCat = useCreateExamCategory();
  const updateCat = useUpdateExamCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamCategoryResponse | null>(null);
  const [form] = Form.useForm<CategoryFormValues>();

  const rows = useMemo(() => toRows(buildCategoryTree(categoriesQ.data ?? [])), [categoriesQ.data]);
  // Default to fully expanded; `defaultExpandAllRows` misses async-loaded data, so
  // control it: null = not yet touched → derive all parent ids live.
  const [expandedKeys, setExpandedKeys] = useState<Key[] | null>(null);
  const effectiveExpanded = expandedKeys ?? collectParentIds(rows);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ kind: "track", sortOrder: 0, status: "active" });
    setModalOpen(true);
  }

  function openEdit(record: ExamCategoryResponse) {
    setEditing(record);
    form.setFieldsValue({
      nameEn: record.name.en,
      nameBn: record.name.bn,
      slug: record.slug,
      sortOrder: record.sortOrder,
      status: record.status,
      parentCategoryId: record.parentCategoryId ?? undefined,
    });
    setModalOpen(true);
  }

  async function onSubmit(values: CategoryFormValues) {
    try {
      if (editing) {
        await updateCat.mutateAsync({
          id: editing.id,
          body: {
            name: toBilingual(values),
            slug: values.slug?.trim() || undefined,
            status: values.status,
            sortOrder: values.sortOrder,
            // "" clears to root; an id reparents (API sentinel contract, leaf-only)
            parentCategoryId: values.parentCategoryId ?? "",
          },
        });
        message.success("Category updated");
      } else {
        await createCat.mutateAsync({
          name: toBilingual(values),
          slug: values.slug?.trim() || undefined,
          sortOrder: values.sortOrder ?? 0,
          kind: values.kind,
          parentCategoryId: values.parentCategoryId ?? null,
        });
        message.success("Category created");
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error ?? "Save failed");
    }
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Categories</Typography.Title>}
      extra={<Button type="primary" onClick={openCreate}>Add category</Button>}
    >
      <Table<CategoryRow>
        rowKey="id"
        loading={categoriesQ.isLoading}
        dataSource={rows}
        pagination={false}
        expandable={{
          expandedRowKeys: effectiveExpanded,
          onExpandedRowsChange: (keys) => setExpandedKeys([...keys]),
        }}
        columns={[
          {
            title: "Name",
            key: "name",
            render: (_, record) => (
              <Space>
                <span>{categoryLabel(record)}</span>
                <Tag color={kindColor[record.kind]}>{record.kind}</Tag>
              </Space>
            ),
          },
          { title: "Slug", dataIndex: "slug" },
          {
            title: "Status", dataIndex: "status",
            render: (s: string) => <Tag color={s === "active" ? "green" : "default"}>{s}</Tag>,
          },
          { title: "Sort", dataIndex: "sortOrder", width: 80 },
          {
            title: "Actions", key: "actions", width: 100,
            render: (_, record) => (
              <Button size="small" onClick={() => openEdit(record)}>Edit</Button>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title={editing ? "Edit category" : "Add category"}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createCat.isPending || updateCat.isPending}
      >
        <Form<CategoryFormValues> form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="nameEn" label="Name (English)">
            <Input placeholder="e.g. BCS" />
          </Form.Item>
          <Form.Item name="nameBn" label="Name (Bangla)">
            <Input placeholder="e.g. বিসিএস" />
          </Form.Item>
          <Form.Item name="slug" label="Slug (optional; derived from name if blank)">
            <Input placeholder="bcs" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          {!editing && (
            <Form.Item name="kind" label="Kind (cannot be changed later)">
              <Select
                options={[
                  { value: "section", label: "Section (grouping only, not selectable)" },
                  { value: "track", label: "Track" },
                  { value: "collection", label: "Collection (must sit under a track)" },
                ]}
              />
            </Form.Item>
          )}
          {editing && (
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: "active", label: "active" },
                  { value: "archived", label: "archived" },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item
            name="parentCategoryId"
            label="Parent (empty = root; reparent is leaf-only, enforced by the API)"
          >
            <CategoryTreeSelect placeholder="None — root category" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
