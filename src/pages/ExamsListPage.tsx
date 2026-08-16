import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Card, DatePicker, Dropdown, Input, Modal, Popconfirm, Select, Space, Table, Typography,
  message,
} from "antd";
import { MoreHorizontal } from "lucide-react";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  useArchiveExam, useExams, usePublishExam, useRestoreExam, useUnpublishExam,
} from "../api/exams";
import { useReschedule } from "../api/commerce";
import type { ExamListFilters, ExamStatus, ExamSummary } from "../api/types";
import { bnNum } from "../lib/bn";
import { formatDhakaShortBn, formatDhakaWindowBn, isSameDhakaDay } from "../lib/format";
import { CONTENT_STATUS } from "../lib/labels";
import { FilterChips, type FilterChipItem } from "../ui/FilterChips";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { ContentStatusChip } from "../ui/StatusChip";

// «সব» is not a status — it is the absence of the filter, so it carries no wire key.
// The three keys are `ExamStatus` (types.ts:151), narrower than the questions list's set.
const STATUSES: ExamStatus[] = ["draft", "published", "archived"];

// Non-optional so `.length` is safe on it; `MenuProps["items"]` itself is `ItemType[] | undefined`.
type MenuItems = NonNullable<MenuProps["items"]>;

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

export function ExamsListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ExamListFilters>({ page: 1, pageSize: 20 });
  const { data, isPending } = useExams(filters);
  const publish = usePublishExam();
  const unpublish = useUnpublishExam();
  const archive = useArchiveExam();
  const restore = useRestoreExam();
  const reschedule = useReschedule();

  // Reschedule modal state: the target row + its editable window (start/end).
  const [rescheduleRow, setRescheduleRow] = useState<ExamSummary | null>(null);
  const [rescheduleWindow, setRescheduleWindow] = useState<[Dayjs | null, Dayjs | null]>([
    null, null,
  ]);

  const set = (patch: Partial<ExamListFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));

  const openReschedule = (row: ExamSummary) => {
    setRescheduleRow(row);
    setRescheduleWindow([
      row.windowStartUtc ? dayjs(row.windowStartUtc) : null,
      row.windowEndUtc ? dayjs(row.windowEndUtc) : null,
    ]);
  };

  const submitReschedule = async () => {
    if (!rescheduleRow) return;
    const [start, end] = rescheduleWindow;
    if (!start || !end) {
      message.error("শুরু ও শেষ — দুটো সময়ই নির্বাচন করুন");
      return;
    }
    try {
      await reschedule.mutateAsync({
        examId: rescheduleRow.id,
        body: { windowStartUtc: start.toISOString(), windowEndUtc: end.toISOString() },
      });
      message.success("উইন্ডো বদলানো হয়েছে");
      setRescheduleRow(null);
    } catch (e) {
      message.error(serverError(e, "রিশিডিউল করা যায়নি"));
    }
  };

  const onPublish = async (id: string) => {
    try {
      await publish.mutateAsync(id);
      message.success("পরীক্ষা প্রকাশিত হয়েছে");
    } catch (e) {
      Modal.error({
        title: "প্রকাশ করা যায়নি",
        // The body is the server's verbatim gate message. It stays English until Task 10
        // translates the API strings — expected, not a defect.
        content: (
          <div style={{ whiteSpace: "pre-line" }}>{serverError(e, "প্রকাশ করা যায়নি")}</div>
        ),
      });
    }
  };

  const onUnpublish = async (id: string) => {
    try {
      await unpublish.mutateAsync(id);
      message.success("আনপাবলিশ হয়েছে — এটি আবার খসড়া");
    } catch (e) {
      message.error(serverError(e, "আনপাবলিশ করা যায়নি"));
    }
  };

  // Archive is the one gated action that has to live in the ⋯ menu (a Popconfirm inside a
  // menu item fights the Dropdown's close-on-click). It is a CONTROLLED <Modal> driven by
  // this row state, not `Modal.confirm`: no `<App>` wrapper is mounted, so antd's static
  // methods render outside the ConfigProvider and never see `buildTheme` — in dark mode the
  // static dialog came up white with an antd-blue OK. Same shape as the reschedule modal
  // below. Retiring the app-wide static `message`/`Modal` usage is a separate T11 ticket.
  const [archiveRow, setArchiveRow] = useState<ExamSummary | null>(null);

  const submitArchive = () => {
    if (!archiveRow) return;
    archive.mutate(archiveRow.id, {
      onSuccess: () => {
        message.success("পরীক্ষা আর্কাইভ হয়েছে");
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
  const filtered = Boolean(filters.search || filters.status || filters.standalone);
  // `total` is the filtered total the server just answered, so the copy must name which one
  // it is — «মোট» on a chip-filtered list would be a lie.
  const summary =
    total == null
      ? undefined
      : filtered
        ? `ফিল্টার অনুযায়ী ${bnNum(total)}টি পরীক্ষা`
        : `মোট ${bnNum(total)}টি পরীক্ষা`;

  const columns: ColumnsType<ExamSummary> = [
    {
      title: "শিরোনাম",
      dataIndex: "title",
      render: (text: string) => (
        <Typography.Text style={{ maxWidth: 320 }} ellipsis={{ tooltip: text }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: "মোড",
      key: "mode",
      width: 150,
      // Bundle membership IS the mode here: a bundled exam is sold, scheduled and published
      // through its model test, a standalone one on its own.
      render: (_, r) =>
        r.modelTestTitle ?? (
          <Typography.Text type="secondary">স্ট্যান্ডঅ্যালোন</Typography.Text>
        ),
    },
    {
      title: "উইন্ডো",
      key: "window",
      width: 230,
      // The T4 ledger flagged this cell for the 62–102px rows: it printed two full
      // `toLocaleString()` datetimes in the browser's own locale/timezone. Now Dhaka-pinned
      // Bengali, collapsed to one line when both ends fall on the same Dhaka day, and two
      // predictable lines when they do not (D8 keeps Western digits for dense numeric
      // columns — a datetime is prose; the Latin AM/PM is the ratified exception).
      render: (_, r) => {
        if (!r.windowStartUtc || !r.windowEndUtc) return "—";
        if (isSameDhakaDay(r.windowStartUtc, r.windowEndUtc)) {
          return (
            <span style={{ whiteSpace: "nowrap" }}>
              {formatDhakaWindowBn(r.windowStartUtc, r.windowEndUtc)}
            </span>
          );
        }
        return (
          <div style={{ lineHeight: 1.35 }}>
            <div style={{ whiteSpace: "nowrap" }}>{formatDhakaShortBn(r.windowStartUtc)}</div>
            <div style={{ whiteSpace: "nowrap" }}>→ {formatDhakaShortBn(r.windowEndUtc)}</div>
          </div>
        );
      },
    },
    {
      title: "প্রশ্ন",
      dataIndex: "questionCount",
      width: 80,
      align: "right",
      className: "ex-num",
    },
    {
      title: "মার্ক",
      dataIndex: "totalMarks",
      width: 80,
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
      width: 180,
      render: (_, r) => {
        // One inline primary + one inline gated action at most; everything else folds into
        // the ⋯ menu. Five wrapped buttons were the other half of the tall-row finding.
        const navItems: MenuItems = [
          ...(r.status === "published" || r.status === "archived"
            ? [{
                key: "results",
                label: "ফলাফল",
                onClick: () => navigate(`/exams/${r.id}/results`),
              }]
            : []),
          ...(r.status === "published" && r.windowStartUtc && r.windowEndUtc
            ? [{ key: "reschedule", label: "রিশিডিউল", onClick: () => openReschedule(r) }]
            : []),
        ];
        const tailItems: MenuItems =
          r.status === "archived"
            ? [{
                key: "restore",
                label: "ফিরিয়ে আনুন",
                onClick: () =>
                  restore.mutate(r.id, {
                    onSuccess: () => message.success("পরীক্ষা ফিরিয়ে আনা হয়েছে"),
                    onError: (e) => message.error(serverError(e, "ফিরিয়ে আনা যায়নি")),
                  }),
              }]
            : [
                // A rule between the navigational items and the destructive one, so আর্কাইভ
                // never sits one careless pixel below «রিশিডিউল». Skipped when it would be
                // the menu's first child — a draft row's menu is আর্কাইভ alone.
                ...(navItems.length ? [{ type: "divider" as const, key: "sep" }] : []),
                {
                  key: "archive",
                  label: "আর্কাইভ",
                  danger: true,
                  onClick: () => setArchiveRow(r),
                },
              ];
        const menuItems: MenuItems = [...navItems, ...tailItems];

        return (
          <Space size={0}>
            {r.status !== "archived" && (
              <Button type="link" size="small" onClick={() => navigate(`/exams/${r.id}`)}>
                {r.status === "draft" ? "সম্পাদনা" : "দেখুন"}
              </Button>
            )}
            {r.status === "draft" && !r.modelTestId && (
              <Popconfirm
                title="প্রকাশ করবেন?"
                okText="হ্যাঁ"
                cancelText="না"
                onConfirm={() => void onPublish(r.id)}
              >
                <Button type="link" size="small" loading={publish.isPending}>
                  প্রকাশ
                </Button>
              </Popconfirm>
            )}
            {r.status === "published" && !r.modelTestId && (
              <Popconfirm
                title="আনপাবলিশ করবেন?"
                description="পরীক্ষাটি আবার সম্পাদনাযোগ্য খসড়া হয়ে যাবে।"
                okText="হ্যাঁ"
                cancelText="না"
                onConfirm={() => void onUnpublish(r.id)}
              >
                <Button type="link" size="small">
                  আনপাবলিশ
                </Button>
              </Popconfirm>
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
        title="পরীক্ষা"
        summary={summary}
        actions={
          <PillButton variant="primary" onClick={() => navigate("/exams/new")}>
            নতুন পরীক্ষা
          </PillButton>
        }
      />

      <Card>
        <div className="ex-filterrow" style={{ marginTop: 0 }}>
          <FilterChips items={statusChips} />
        </div>

        <Space wrap style={{ margin: "12px 0 16px" }}>
          <Input.Search
            placeholder="পরীক্ষার নাম খুঁজুন"
            allowClear
            style={{ width: 240 }}
            onSearch={(v) => set({ search: v || undefined })}
          />
          <Select
            placeholder="ধরন"
            allowClear
            style={{ width: 180 }}
            value={filters.standalone ? "standalone" : undefined}
            onChange={(v) => set({ standalone: v === "standalone" || undefined })}
            options={[{ value: "standalone", label: "শুধু স্ট্যান্ডঅ্যালোন" }]}
          />
        </Space>

        <Table<ExamSummary>
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

      <Modal
        title="রিশিডিউল"
        open={rescheduleRow !== null}
        onCancel={() => setRescheduleRow(null)}
        onOk={() => void submitReschedule()}
        okText="রিশিডিউল"
        cancelText="বাতিল"
        confirmLoading={reschedule.isPending}
      >
        <Typography.Paragraph type="secondary">
          নির্ধারিত সময়সীমা শুরু হওয়ার আগেই কেবল সরানো যায়। একবার শুরু হয়ে গেলে আর বদলানো যাবে না।
        </Typography.Paragraph>
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Typography.Text strong>শুরু</Typography.Text>
            <br />
            <DatePicker
              showTime
              style={{ width: "100%" }}
              value={rescheduleWindow[0]}
              onChange={(v) => setRescheduleWindow(([, end]) => [v, end])}
            />
          </div>
          <div>
            <Typography.Text strong>শেষ</Typography.Text>
            <br />
            <DatePicker
              showTime
              style={{ width: "100%" }}
              value={rescheduleWindow[1]}
              onChange={(v) => setRescheduleWindow(([start]) => [start, v])}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
}
