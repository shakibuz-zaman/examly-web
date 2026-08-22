import { App, Button, Card, Form, Input, InputNumber, Modal, Select, Skeleton, Space, Table, Tag } from "antd";
import { useMemo, useState, type Key } from "react";
import {
  buildCategoryTree, categoryLabel,
  useAdminExamCategories, useCreateExamCategory, useUpdateExamCategory,
  type CategoryKind, type CategoryNode, type ExamCategoryResponse,
  type UpdateExamCategoryRequest,
} from "../api/categories";
import type { BilingualText } from "../api/types";
import { CategoryTreeSelect } from "../features/categories/CategoryTreeSelect";
import { count } from "../lib/format";
import { lookup } from "../lib/lookup";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";

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

// Both maps are typed to `string` keys, not to `CategoryKind`/a status union: the wire is
// untyped JSON, and `lookup` (lib/lookup) is the prototype-key guard every string-keyed map on
// these admin surfaces now goes through. A kind we cannot read falls back to the raw wire word
// with no tint, which asserts nothing — the same rule the chip vocabulary records.
const KIND_COLOR: Record<string, string> = {
  section: "purple",
  track: "green",
  collection: "default",
};

const KIND_LABEL: Record<string, string> = {
  section: "Section",
  track: "Track",
  collection: "Collection",
};

// D1: these platform_admin bodies stay English, so the raw wire word is title-cased rather
// than printed as the lowercase enum key an API reader would recognise.
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  archived: "Archived",
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
  // AppShell mounts antd's `App` inside the admin ConfigProvider; the imported statics render
  // into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
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
        const body: UpdateExamCategoryRequest = {
          name: toBilingual(values),
          slug: values.slug?.trim() || undefined,
          status: values.status,
          sortOrder: values.sortOrder,
        };
        // API tri-state for parentCategoryId: absent = unchanged, "" = clear to
        // root, id = reparent (leaf-only). Sending it on every edit makes the API
        // enter its reparent branch and 400s any node with children — so include
        // the key ONLY when the parent actually changed vs the record being edited.
        const oldParent = editing.parentCategoryId ?? null;
        const newParent = values.parentCategoryId ?? null;
        if (newParent !== oldParent) {
          body.parentCategoryId = newParent ?? ""; // cleared → "", else the new id
        }
        await updateCat.mutateAsync({ id: editing.id, body });
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

  // The count is of the FLAT list, not of `rows`: `rows` holds roots only, and "3 categories"
  // for a tree of thirty is worse than no summary at all. Singular guarded (`count`) — a fresh
  // environment really does hold one category.
  const summary =
    categoriesQ.data == null
      ? undefined
      : count(categoriesQ.data.length, "category", "categories");

  return (
    <>
      <PageHeader
        title="Categories"
        summary={summary}
        actions={
          <PillButton variant="primary" onClick={openCreate}>
            Add category
          </PillButton>
        }
      />

      {/* The house three-state shape (see ui/RetryNotice). The branch keys on `!data`, never
          `isError`: TanStack keeps `data` through a same-key refetch failure, so a tree we
          already hold stays on screen under the strip instead of being replaced by an empty
          table. Copy is English throughout (D1). */}
      {categoriesQ.isPending ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !categoriesQ.data ? (
        <RetryNotice
          tone="panel"
          busy={categoriesQ.isFetching}
          onRetry={() => void categoriesQ.refetch()}
          message="Couldn't load the category tree."
          retryLabel="Try again"
        />
      ) : (
        <Card>
          {categoriesQ.isError && (
            <RetryNotice
              tone="strip"
              busy={categoriesQ.isFetching}
              onRetry={() => void categoriesQ.refetch()}
              message="Couldn't refresh — showing the previous data."
              retryLabel="Try again"
            />
          )}
          <Table<CategoryRow>
            rowKey="id"
            dataSource={rows}
            pagination={false}
            locale={{ emptyText: "No categories yet." }}
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
                    <Tag color={lookup(KIND_COLOR, record.kind) ?? "default"}>
                      {lookup(KIND_LABEL, record.kind) ?? record.kind}
                    </Tag>
                  </Space>
                ),
              },
              // A slug is an identifier — Latin, ratified — and tabular so a column of them
              // lines up character by character.
              { title: "Slug", dataIndex: "slug", className: "ex-num" },
              {
                title: "Status", dataIndex: "status", width: 120,
                render: (s: string) => (
                  <Tag color={s === "active" ? "green" : "default"}>
                    {lookup(STATUS_LABEL, s) ?? s}
                  </Tag>
                ),
              },
              { title: "Sort", dataIndex: "sortOrder", width: 80, align: "right", className: "ex-num" },
              {
                title: "Actions", key: "actions", width: 100,
                render: (_, record) => (
                  <Button size="small" onClick={() => openEdit(record)}>Edit</Button>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* `forceRender`: the form instance is seeded by `openEdit`/`openCreate` BEFORE the
          modal opens, and antd does not mount a dialog's children until its first open — so
          without this the first seed lands on an unconnected instance and antd logs the
          "Instance created by `useForm` is not connected to any Form element" warning.
          Explicit ok/cancel text: AppShell's ConfigProvider carries antd's bn_BD locale, so
          un-passed buttons print «বাতিল» in the middle of an English page. */}
      <Modal
        open={modalOpen}
        forceRender
        title={editing ? "Edit category" : "Add category"}
        okText="Save"
        cancelText="Cancel"
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
            <InputNumber min={0} className="ex-num" style={{ width: "100%" }} />
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
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item
            name="parentCategoryId"
            label="Parent (empty = root; reparent is leaf-only, enforced by the API)"
          >
            <CategoryTreeSelect placeholder="None — root category" sectionsSelectable />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
