import { useState } from "react";
import {
  App, Button, Card, Input, Modal, Popconfirm, Segmented, Skeleton, Space, Table, Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useAdminWithdrawals, useMarkPaid, useRejectWithdrawal,
} from "../api/commerce";
import type { Withdrawal } from "../api/commerce";
import { enMoney } from "../lib/bn";
import { count, formatDhakaDateTimeEn } from "../lib/format";
import { lookup } from "../lib/lookup";
import { PageHeader } from "../ui/PageHeader";
import { RetryNotice } from "../ui/RetryNotice";
import { MoneyChip, type MoneyTone } from "../ui/StatusChip";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// The API's status values are exactly requested / paid / rejected (WalletEndpoints /
// Withdrawal domain). Tones are the SAME readings WalletPage gives the examiner's own copy of
// this table — amber is still queued, neutral went out, coral went wrong — so an admin and an
// examiner looking at one payout see one colour. Labels are the English half (D1).
const STATUS: Record<string, { tone: MoneyTone; label: string }> = {
  requested: { tone: "queued", label: "Queued" },
  paid: { tone: "outflow", label: "Paid" },
  rejected: { tone: "danger", label: "Rejected" },
};

type StatusFilter = "requested" | "paid" | "rejected";

// One entry per filter: how the header counts the rows, what the empty table says, and whether
// a summed ৳ total means anything. The singular is not decoration — the queue routinely holds
// exactly one request, and "1 requests awaiting payout" is the plural bug a Task 4 review
// caught on another header.
//
// `total: false` on rejected is the same kind of claim-control: the sum of the OTHER two is
// money the platform owes or has sent, which is what an admin opening this queue is counting.
// Rejected requests moved no money at all — the debit was reversed back into the org's wallet —
// so «৳500 total» there would total up a number that never left, sitting in the same slot where
// the other two filters print real liability.
const FILTER: Record<StatusFilter, { one: string; many: string; empty: string; total: boolean }> = {
  requested: {
    one: "request awaiting payout",
    many: "requests awaiting payout",
    empty: "No withdrawal requests are waiting.",
    total: true,
  },
  paid: {
    one: "paid payout",
    many: "paid payouts",
    empty: "No withdrawals have been paid yet.",
    total: true,
  },
  rejected: {
    one: "rejected request",
    many: "rejected requests",
    empty: "No withdrawals have been rejected.",
    total: false,
  },
};

export function WithdrawalsPage() {
  // AppShell mounts antd's `App` inside the admin ConfigProvider; the imported statics render
  // into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
  // Pass the status EXPLICITLY on every read — the hook's no-arg default is requested-only, so
  // "paid"/"rejected" would silently fall back to requested if we relied on the default.
  const [status, setStatus] = useState<StatusFilter>("requested");
  const queue = useAdminWithdrawals(status);
  const { data, refetch } = queue;
  const markPaid = useMarkPaid();
  const reject = useRejectWithdrawal();

  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null);
  const [reason, setReason] = useState("");

  const onMarkPaid = async (w: Withdrawal) => {
    try {
      await markPaid.mutateAsync(w.id);
      message.success("Marked paid");
    } catch (e) {
      // 409 already-processed (a racing admin acted first) → show the server message and refetch
      // so the queue drops the now-terminal row.
      message.error(serverError(e, "Could not mark paid"));
      void refetch();
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!reason.trim()) {
      message.error("Enter a reason");
      return;
    }
    try {
      await reject.mutateAsync({ id: rejectTarget.id, reason: reason.trim() });
      message.success("Withdrawal rejected");
      setRejectTarget(null);
      setReason("");
    } catch (e) {
      message.error(serverError(e, "Could not reject"));
      void refetch();
    }
  };

  const columns: ColumnsType<Withdrawal> = [
    {
      title: "Organization",
      dataIndex: "orgId",
      key: "orgId",
      // An id is an identifier — Latin, ratified — and stays monospaced so two of them can be
      // compared character by character.
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: "Amount",
      dataIndex: "amountBdt",
      key: "amountBdt",
      align: "right",
      width: 130,
      className: "ex-num",
      render: (v: number) => enMoney(v),
    },
    {
      title: "Destination",
      dataIndex: "destination",
      key: "destination",
      // A bKash number is an identifier — Latin digits, and tabular so a column of them aligns.
      className: "ex-num",
    },
    {
      title: "Requested",
      dataIndex: "requestedAt",
      key: "requestedAt",
      width: 190,
      className: "ex-num",
      // Was `toLocaleString()` — the reader's own locale AND timezone, so an admin abroad read
      // a payout queue at different wall-clock times than the examiner who filed it. Dhaka-
      // pinned English now, the D1 counterpart of the ledger's Bengali column.
      // `|| "—"`: the formatter returns "" on an unparseable instant (house convention — the
      // caller decides what to print instead), and an empty money-table cell reads as a bug.
      render: (v: string) => (
        <span style={{ whiteSpace: "nowrap" }}>{formatDhakaDateTimeEn(v) || "—"}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      // Unknown wire value → the NEUTRAL tone and the raw key, never `queued`: the rule
      // ContentStatusChip's archived fallback records — a value we cannot read must assert
      // nothing, and amber would claim "still waiting on you" about a state we do not know.
      render: (s: string) => {
        const hit = lookup(STATUS, s);
        return <MoneyChip tone={hit?.tone ?? "outflow"} label={hit?.label ?? s} />;
      },
    },
    {
      title: "Reason",
      dataIndex: "rejectReason",
      key: "rejectReason",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, w) =>
        w.status === "requested" ? (
          <Space>
            <Popconfirm
              title="Mark this withdrawal paid?"
              description="Confirms the payout was sent to the destination. This is terminal."
              okText="Mark paid"
              // Explicit: AppShell's ConfigProvider carries antd's bn_BD locale, so an
              // un-passed cancel button prints «বাতিল» in the middle of an English page.
              cancelText="Cancel"
              onConfirm={() => onMarkPaid(w)}
            >
              <Button size="small" type="primary">Mark paid</Button>
            </Popconfirm>
            <Button
              size="small"
              danger
              onClick={() => {
                setRejectTarget(w);
                setReason("");
              }}
            >
              Reject
            </Button>
          </Space>
        ) : (
          "—"
        ),
    },
  ];

  const total = data?.reduce((sum, w) => sum + w.amountBdt, 0) ?? 0;
  const summary =
    data == null
      ? undefined
      : count(data.length, FILTER[status].one, FILTER[status].many) +
        (FILTER[status].total ? ` · ${enMoney(total)} total` : "");

  return (
    <>
      <PageHeader
        title="Withdrawal queue"
        summary={summary}
        actions={
          <Segmented
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
            options={[
              { label: "Requested", value: "requested" },
              { label: "Paid", value: "paid" },
              { label: "Rejected", value: "rejected" },
            ]}
          />
        }
      />

      {/* The house three-state shape (see ui/RetryNotice). The branch keys on `!data`, never
          `isError`: TanStack keeps `data` through a same-key refetch failure, so a queue we
          already hold stays on screen under the strip instead of being replaced by an empty
          table whose only clue was a one-line locale override. A filter switch is a NEW query
          key, so it lands in the pending branch and gets the skeleton, not a stale queue
          labelled with the wrong status. */}
      {queue.isPending ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !data ? (
        <RetryNotice
          tone="panel"
          busy={queue.isFetching}
          onRetry={() => void refetch()}
          message="Couldn't load the withdrawal queue."
          retryLabel="Try again"
        />
      ) : (
        <Card>
          {queue.isError && (
            <RetryNotice
              tone="strip"
              busy={queue.isFetching}
              onRetry={() => void refetch()}
              message="Couldn't refresh — showing the previous data."
              retryLabel="Try again"
            />
          )}
          <Table<Withdrawal>
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={data}
            pagination={false}
            locale={{ emptyText: FILTER[status].empty }}
            scroll={{ x: true }}
          />
        </Card>
      )}

      <Modal
        open={rejectTarget !== null}
        title="Reject withdrawal"
        okText="Reject"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        confirmLoading={reject.isPending}
        onOk={() => void submitReject()}
        onCancel={() => setRejectTarget(null)}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          Rejecting reverses the debit and returns the amount to the org's wallet.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (shown to the examiner)"
        />
      </Modal>
    </>
  );
}
