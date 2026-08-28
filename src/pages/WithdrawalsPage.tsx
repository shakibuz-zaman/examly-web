import { useState } from "react";
import {
  App, Button, Card, Input, Modal, Popconfirm, Segmented, Skeleton, Space, Table, Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useAdminWithdrawals, useApproveWithdrawal, useRejectWithdrawal, useRetryWithdrawal,
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

// The API's status values are exactly requested / processing / paid / payout_failed / rejected
// (WalletEndpoints / Withdrawal domain). Tones are the SAME readings WalletPage gives the
// examiner's own copy of this table — amber is still queued (requested AND processing, both
// money in flight), neutral went out, coral went wrong (payout_failed AND rejected) — so an
// admin and an examiner looking at one payout see one colour. Labels are the English half (D1).
const STATUS: Record<string, { tone: MoneyTone; label: string }> = {
  requested: { tone: "queued", label: "Queued" },
  processing: { tone: "queued", label: "Processing" },
  paid: { tone: "outflow", label: "Paid" },
  payout_failed: { tone: "danger", label: "Payout failed" },
  rejected: { tone: "danger", label: "Rejected" },
};

type StatusFilter = "requested" | "processing" | "payout_failed" | "paid" | "rejected";

// One entry per filter: how the header counts the rows, what the empty table says, and whether
// a summed ৳ total means anything. The singular is not decoration — the queue routinely holds
// exactly one request, and "1 requests awaiting payout" is the plural bug a Task 4 review
// caught on another header.
//
// `total` is claim-control, not a display toggle: a ৳ total renders ONLY where the sum is real
// platform liability — money the platform still owes (requested, processing, payout_failed: the
// debit is written at request time and sits out of the balance until the payout settles or is
// reversed) or money it has actually sent (paid). All four clear that bar, so all four carry
// `total: true`. Rejected is the sole exception: a rejected request moved no money at all — the
// debit was reversed back into the org's wallet — so «৳500 total» there would sum a number that
// never left, sitting in the same slot where the liability filters print real exposure.
const FILTER: Record<StatusFilter, { one: string; many: string; empty: string; total: boolean }> = {
  requested: {
    one: "request awaiting payout",
    many: "requests awaiting payout",
    empty: "No withdrawal requests are waiting.",
    total: true,
  },
  processing: {
    one: "payout in flight",
    many: "payouts in flight",
    empty: "No payouts are in flight.",
    total: true,
  },
  payout_failed: {
    one: "failed payout",
    many: "failed payouts",
    empty: "No payouts have failed.",
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
  const approve = useApproveWithdrawal();
  const retry = useRetryWithdrawal();
  const reject = useRejectWithdrawal();

  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null);
  const [reason, setReason] = useState("");

  // Approve AND retry return 200 for ALL THREE non-error verdicts — the server does not fail the
  // request when the GATEWAY refuses. `paid` really went out; `payout_failed` means the gateway
  // refused (or a bounced attempt was reconfirmed unpaid); `processing` means the disbursement is
  // in flight OR (on retry) the prior attempt could not be re-queried, so nothing was re-sent. A
  // flat "Payout sent" would paint a green success over a refusal while the row slid to a tab the
  // admin isn't looking at — so we read the returned status and tell the admin where the row went.
  // `w` is typed Withdrawal (the mutationFn's return), so the branch is compiler-checked.
  const announce = (w: Withdrawal) => {
    switch (w.status) {
      case "paid":
        return message.success(`Payout sent — txn ${w.payoutTxnId ?? "recorded"}`);
      case "payout_failed":
        return message.error(
          `Payout failed — ${w.payoutFailReason ?? "gateway refused"}. See the Failed tab.`);
      case "processing":
        return message.info(
          "Payout submitted — awaiting gateway confirmation. See the Processing tab.");
      default:
        // A status we do not model — assert nothing beyond echoing the raw wire value.
        return message.info(`Payout status: ${w.status}. See the matching tab.`);
    }
  };

  const onApprove = async (w: Withdrawal) => {
    try {
      announce(await approve.mutateAsync(w.id));
      void refetch();
    } catch (e) {
      // 409 (a racing admin acted first, wrong state, KYC refusal, or a gateway-ambiguity
      // refusal) → surface the server's own sentence and refetch so the queue drops the row that
      // just moved on. Same shape the old mark-paid handler used.
      message.error(serverError(e, "Could not approve"));
      void refetch();
    }
  };

  const onRetry = async (w: Withdrawal) => {
    try {
      announce(await retry.mutateAsync(w.id));
      void refetch();
    } catch (e) {
      // 409 (wrong state or a gateway-ambiguity refusal) → surface the server sentence, refetch.
      message.error(serverError(e, "Could not retry"));
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
      // Reject can 409 in two different ways, and the modal must react differently to each.
      //   • "settled as paid" — the failed attempt was re-confirmed PAID, the row is now terminal
      //     `paid` and there is nothing left to reject. Close the modal.
      //   • "cannot confirm yet" (gateway Unknown) — the row STAYS `payout_failed`; the admin can
      //     reject again once the gateway answers, so keep the modal (and the typed reason) open.
      // We tell the two apart off the refetched queue: the reject action only fires from the
      // Failed tab, so a target that no longer appears as `payout_failed` has moved on.
      message.error(serverError(e, "Could not reject"));
      const targetId = rejectTarget.id;
      const res = await refetch();
      const stillFailed = res.data?.some(
        (r) => r.id === targetId && r.status === "payout_failed") ?? false;
      if (!stillFailed) {
        setRejectTarget(null);
        setReason("");
      }
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
      // The server stamps `bkash:{E.164}` only at approval (D4); a still-`requested` row carries
      // "", so strip the transport prefix and go «—» until there is a number. Same expression as
      // the examiner's own copy of this table (Task 9).
      render: (v: string) => (v ? v.replace(/^bkash:/, "") : "—"),
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
      title: "Payout txn",
      dataIndex: "payoutTxnId",
      key: "payoutTxnId",
      width: 220,
      // The gateway's own id for a settled payout (dev stub writes `DEV-…`) — an identifier, so
      // monospaced Latin; «—» until a payout has actually gone out.
      render: (v: string | null) => (v ? <Typography.Text code>{v}</Typography.Text> : "—"),
    },
    {
      title: "Reason",
      // Neutral key: this cell renders EITHER field, so it is bound to no single one.
      key: "reason",
      // Order is load-bearing, not a "never both" convenience. RejectWithdrawal accepts a
      // payout_failed → rejected transition and does NOT clear the stale payoutFailReason, so a
      // rejected-after-failed row carries both: the admin's rejection sentence is the current,
      // authoritative reason and wins; the retained gateway note is the older line beneath it.
      // Same expression as the examiner's copy (Task 9).
      render: (_, w) => w.rejectReason ?? w.payoutFailReason ?? "—",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, w) => {
        if (w.status === "requested") {
          return (
            <Space>
              <Popconfirm
                title="Send this payout via bKash?"
                description={`Pays ${enMoney(w.amountBdt)} to the org owner's verified login number. This moves real money.`}
                okText="Approve"
                // Explicit: AppShell's ConfigProvider carries antd's bn_BD locale, so an
                // un-passed cancel button prints «বাতিল» in the middle of an English page.
                cancelText="Cancel"
                onConfirm={() => onApprove(w)}
              >
                <Button size="small" type="primary">Approve</Button>
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
          );
        }
        if (w.status === "payout_failed") {
          return (
            <Space>
              <Popconfirm
                title="Retry this payout?"
                description="Re-queries the previous attempt first; pays again only if it never went through."
                okText="Retry"
                cancelText="Cancel"
                onConfirm={() => onRetry(w)}
              >
                <Button size="small" type="primary">Retry</Button>
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
          );
        }
        // `processing` is mid-settlement — no manual action; the reconciliation sweep resolves it,
        // and the tooltip says so. Terminal rows (paid / rejected) get a bare em-dash.
        if (w.status === "processing") {
          return (
            <span title="Settling — the reconciliation sweep resolves this.">—</span>
          );
        }
        return "—";
      },
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
              { label: "Processing", value: "processing" },
              { label: "Failed", value: "payout_failed" },
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
