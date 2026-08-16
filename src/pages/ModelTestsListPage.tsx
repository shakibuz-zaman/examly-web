import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Dropdown, Input, Modal, Space, Table, Typography, message } from "antd";
import { MoreHorizontal } from "lucide-react";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useArchiveModelTest, useModelTests, useRestoreModelTest,
} from "../api/modelTests";
import type { ExamStatus, ModelTestListFilters, ModelTestSummary } from "../api/types";
import { bnNum } from "../lib/bn";
import { formatDhakaShortBn } from "../lib/format";
import { CONTENT_STATUS } from "../lib/labels";
import { FilterChips, type FilterChipItem } from "../ui/FilterChips";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { ContentStatusChip } from "../ui/StatusChip";

// Same three keys as the exams list — a model test carries `ExamStatus` (types.ts:286).
// «সব» is the absence of the filter, so it has no wire key.
const STATUSES: ExamStatus[] = ["draft", "published", "archived"];

// Non-optional so `.length` is safe on it; `MenuProps["items"]` itself is `ItemType[] | undefined`.
type MenuItems = NonNullable<MenuProps["items"]>;

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

export function ModelTestsListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ModelTestListFilters>({ page: 1, pageSize: 20 });
  const { data, isPending } = useModelTests(filters);
  const archive = useArchiveModelTest();
  const restore = useRestoreModelTest();

  const set = (patch: Partial<ModelTestListFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  // Archive is the destructive action, so it lives in the ⋯ menu — and its confirm is a
  // CONTROLLED <Modal> driven by this row state, never `Modal.confirm`: no `<App>` wrapper is
  // mounted, so antd's static methods render outside the ConfigProvider, never see
  // `buildTheme`, and come up white-with-antd-blue in dark mode (T7 fix wave).
  const [archiveRow, setArchiveRow] = useState<ModelTestSummary | null>(null);

  const submitArchive = () => {
    if (!archiveRow) return;
    archive.mutate(archiveRow.id, {
      onSuccess: () => {
        message.success("মডেল টেস্ট আর্কাইভ হয়েছে");
        setArchiveRow(null);
      },
      onError: (e) => message.error(serverError(e, "আর্কাইভ করা যায়নি")),
    });
  };

  // One open ⋯ menu at a time, tracked so the trigger can carry a truthful `aria-expanded`.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const statusChips: FilterChipItem[] = [
    {
      key: "all",
      label: "সব",
      selected: !filters.status,
      onClick: () => set({ status: undefined }),
    },
    ...STATUSES.map((s) => ({
      key: s,
      label: CONTENT_STATUS[s],
      selected: filters.status === s,
      // Re-clicking the active chip clears back to «সব» rather than being a no-op.
      onClick: () => set({ status: filters.status === s ? undefined : s }),
    })),
  ];

  const total = data?.total;
  const filtered = Boolean(filters.search || filters.status);
  // `total` is the *filtered* total the server just answered — «মোট» on a chip-filtered
  // list would be a lie, so the copy names which one it is.
  const summary =
    total == null
      ? undefined
      : filtered
        ? `ফিল্টার অনুযায়ী ${bnNum(total)}টি মডেল টেস্ট`
        : `মোট ${bnNum(total)}টি মডেল টেস্ট`;

  const columns: ColumnsType<ModelTestSummary> = [
    {
      title: "শিরোনাম",
      dataIndex: "title",
      render: (text: string) => (
        <Typography.Text style={{ maxWidth: 360 }} ellipsis={{ tooltip: text }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: "পরীক্ষা",
      dataIndex: "examCount",
      width: 90,
      align: "right",
      className: "ex-num",
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      width: 110,
      render: (s: ExamStatus) => <ContentStatusChip status={s} />,
    },
    {
      title: "প্রকাশিত",
      dataIndex: "publishedAt",
      width: 140,
      // Dhaka-pinned Bengali, one nowrap line — the old `toLocaleString()` printed in the
      // browser's own locale/timezone and was half of the T4 tall-row finding.
      render: (d: string | null) => (
        <span style={{ whiteSpace: "nowrap" }}>{d ? formatDhakaShortBn(d) : "—"}</span>
      ),
    },
    {
      title: "হালনাগাদ",
      dataIndex: "updatedAt",
      width: 140,
      render: (d: string) => (
        <span style={{ whiteSpace: "nowrap" }}>{formatDhakaShortBn(d)}</span>
      ),
    },
    {
      title: "অ্যাকশন",
      key: "actions",
      width: 140,
      render: (_, r) => {
        // One inline navigational action; the destructive/restorative one folds into ⋯,
        // exactly as on the exams list. No divider is ever needed here — each menu holds a
        // single item, and a rule as the first child is the case T7 explicitly skips.
        const menuItems: MenuItems =
          r.status === "archived"
            ? [{
                key: "restore",
                label: "ফিরিয়ে আনুন",
                onClick: () =>
                  restore.mutate(r.id, {
                    onSuccess: () => message.success("মডেল টেস্ট ফিরিয়ে আনা হয়েছে"),
                    onError: (e) => message.error(serverError(e, "ফিরিয়ে আনা যায়নি")),
                  }),
              }]
            : [{
                key: "archive",
                label: "আর্কাইভ",
                danger: true,
                onClick: () => setArchiveRow(r),
              }];

        return (
          <Space size={0}>
            {r.status !== "archived" && (
              <Button type="link" size="small" onClick={() => navigate(`/model-tests/${r.id}`)}>
                {r.status === "draft" ? "সম্পাদনা" : "দেখুন"}
              </Button>
            )}
            <Dropdown
              trigger={["click"]}
              menu={{ items: menuItems }}
              // Controlled so the trigger's `aria-expanded` is the truth and not a guess:
              // antd puts no ARIA on the child it clones, and an icon-only button that
              // silently opens a menu announces as a plain button otherwise.
              open={openMenuId === r.id}
              onOpenChange={(next) => setOpenMenuId(next ? r.id : null)}
            >
              <Button
                type="link"
                size="small"
                aria-label="আরও অ্যাকশন"
                aria-haspopup="menu"
                aria-expanded={openMenuId === r.id}
              >
                <MoreHorizontal size={16} aria-hidden />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="মডেল টেস্ট"
        summary={summary}
        actions={
          <PillButton variant="primary" onClick={() => navigate("/model-tests/new")}>
            নতুন মডেল টেস্ট
          </PillButton>
        }
      />

      <Card>
        <div className="ex-filterrow" style={{ marginTop: 0 }}>
          <FilterChips items={statusChips} />
        </div>

        <Space wrap style={{ margin: "12px 0 16px" }}>
          <Input.Search
            placeholder="মডেল টেস্টের নাম খুঁজুন"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => set({ search: v || undefined })}
          />
        </Space>

        <Table<ModelTestSummary>
          rowKey="id"
          loading={isPending}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={{
            current: data?.page ?? filters.page,
            pageSize: data?.pageSize ?? filters.pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
          }}
        />
      </Card>

      <Modal
        title="আর্কাইভ করবেন?"
        open={archiveRow !== null}
        onCancel={() => setArchiveRow(null)}
        onOk={submitArchive}
        okText="হ্যাঁ"
        cancelText="না"
        okButtonProps={{ danger: true }}
        confirmLoading={archive.isPending}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          «{archiveRow?.title}» তালিকা থেকে সরে যাবে। পরে আর্কাইভড ফিল্টার থেকে ফিরিয়ে আনা যাবে।
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
