import { useState } from "react";
import {
  App, Button, Card, Descriptions, Input, Modal, Skeleton, Space, Table, Typography,
} from "antd";
import type { DescriptionsProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useAdminDuplicates, useAdminOrder, useResolveDuplicate, useVoidOrder,
} from "../api/commerce";
import { enMoney } from "../lib/bn";
import { count, formatDhakaDateTimeEn } from "../lib/format";
import { lookup } from "../lib/lookup";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";
import { MoneyChip, type MoneyTone } from "../ui/StatusChip";
import type { AdminOrder } from "../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// The four order states map 1:1 onto the money vocabulary T1 settled (ui/StatusChip): the sale
// is still queued, the money came IN, the attempt went wrong, and a void is the quiet neutral —
// a reversal the platform performed on purpose is not an alarm. No new chip vocabulary for the
// admin pages, and the same four readings the wallet ledger and the payout queue already use.
const STATUS: Record<string, { tone: MoneyTone; label: string }> = {
  pending: { tone: "queued", label: "Pending" },
  paid: { tone: "inflow", label: "Paid" },
  failed: { tone: "danger", label: "Failed" },
  voided: { tone: "outflow", label: "Voided" },
};

const KIND_LABEL: Record<string, string> = {
  b2c_purchase: "Student purchase (B2C)",
  b2b_slot: "Seat × exam slot (B2B)",
  b2b_upgrade: "Slot upgrade (B2B)",
};

function isB2c(order: AdminOrder): boolean {
  return order.kind === "b2c_purchase";
}

// Western digits with tabular alignment (D8): money, slot counts, identifiers and clock times.
// A ৳ figure and a timestamp stacked in the same Descriptions column only line up if both are
// tabular, and a lakh-grouped amount is the one value here a reader compares against another row.
function Num({ children }: { children: string }) {
  return <span className="ex-num">{children}</span>;
}

// Explicit, for the same reason the void Modal passes `cancelText`: AppShell's ConfigProvider
// carries antd's bn_BD locale, so an un-passed copy control tooltips itself «অনুলিপি» /
// «অনুলিপি হয়েছে» — and that string is the button's aria-label too — in the middle of an
// English admin page (D1).
const COPY_TOOLTIPS: [string, string] = ["Copy", "Copied"];

// The void-confirmation copy spells out the concrete effects, which differ by order kind.
function voidEffects(order: AdminOrder): string {
  if (isB2c(order)) {
    const share = order.authorShareBdt ?? 0;
    return `Revokes the buyer's access and claws back ${enMoney(share)} from the author wallet.`;
  }
  return (
    `Rolls back the ${order.seatSlot ?? "?"} × ${order.examSlot ?? "?"} slot purchase for this org. ` +
    "This is refused if any seats have already been claimed — clean the roster first."
  );
}

function OrderDetail({ order, onVoided }: { order: AdminOrder; onVoided: () => void }) {
  // AppShell mounts antd's `App` inside the admin ConfigProvider; the imported statics render
  // into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
  const voidOrder = useVoidOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const items: DescriptionsProps["items"] = [
    {
      key: "kind",
      label: "Kind",
      children: lookup(KIND_LABEL, order.kind) ?? order.kind,
    },
    { key: "product", label: "Product", children: order.productTitle },
    {
      key: "buyer",
      label: "Buyer",
      children: isB2c(order) ? `Student ${order.studentId ?? "—"}` : `Org ${order.orgId ?? "—"}`,
    },
    // `enMoney`, not `bnMoney`: same rounding, same lakh grouping (both are one function in
    // lib/bn now), Western digits. 7f Task 11 put bnMoney here when these pages were still
    // untouched English bodies; D1 makes the digits English too, and the queue one page over
    // prints the same money the same way.
    { key: "amount", label: "Amount", children: <Num>{enMoney(order.amountBdt)}</Num> },
    // The VAT stamp frozen at mint (D5), NOT a live recomputation off the current platform
    // config: the rate can be changed on the config page, and an order settled last quarter
    // answers for the rate it was actually charged at. Prices are VAT-inclusive, so this is a
    // slice of the Amount row above, never something on top of it.
    {
      key: "vat",
      label: "VAT",
      children: <Num>{`${enMoney(order.vatBdt)} (${order.vatRatePercent}%)`}</Num>,
    },
    ...(isB2c(order)
      ? [
          {
            key: "commission",
            label: "Commission",
            children:
              order.commissionBdt != null ? <Num>{enMoney(order.commissionBdt)}</Num> : "—",
          },
          {
            key: "share",
            label: "Author share",
            children:
              order.authorShareBdt != null ? <Num>{enMoney(order.authorShareBdt)}</Num> : "—",
          },
        ]
      : [
          {
            key: "slots",
            label: "Slots",
            // Both halves are guarded: a standalone order is one exam by construction, and the
            // matrix has no 1-seat cell today but the wire is what it is — "1 seats × 1 exams"
            // is the kind of line that only shows up in the row an admin is investigating.
            children: (
              <Num>
                {order.seatSlot == null || order.examSlot == null
                  ? `${order.seatSlot ?? "?"} seats × ${order.examSlot ?? "?"} exams`
                  : `${count(order.seatSlot, "seat", "seats")} × ${count(order.examSlot, "exam", "exams")}`}
              </Num>
            ),
          },
        ]),
    // Which adapter minted the session, and the gateway's own id for the settlement. Both are
    // the trail an admin follows OFF this page — into the provider's dashboard — so the txn id
    // is copyable rather than something to retype, and the provider key is printed raw: it is
    // the adapter name the API answers with, and a prettified label would not match what the
    // logs and the gateway console call it.
    { key: "provider", label: "Provider", children: order.provider },
    {
      key: "gatewayTxn",
      label: "Gateway txn",
      children: order.gatewayTxnId ? (
        <Typography.Text copyable={{ tooltips: COPY_TOOLTIPS }}>
          {order.gatewayTxnId}
        </Typography.Text>
      ) : (
        "—"
      ),
    },
    // Dhaka-pinned, like every other timestamp in the app: `toLocaleString()` printed the
    // reader's own timezone, so an admin abroad read a different paid-at than the ledger row
    // that answers for it.
    // `|| "—"` on all three: the formatter returns "" on an unparseable instant (house
    // convention — the caller decides what to print instead), and a blank cell in an order
    // trail reads as "this never happened" rather than "this date is broken".
    {
      key: "created",
      label: "Created",
      children: <Num>{formatDhakaDateTimeEn(order.createdAt) || "—"}</Num>,
    },
    ...(order.paidAt
      ? [{
          key: "paid",
          label: "Paid",
          children: <Num>{formatDhakaDateTimeEn(order.paidAt) || "—"}</Num>,
        }]
      : []),
    ...(order.voidedAt
      ? [
          {
            key: "voided",
            label: "Voided",
            children: (
              <>
                <Num>{formatDhakaDateTimeEn(order.voidedAt) || "—"}</Num>
                {order.voidedBy ? ` by ${order.voidedBy}` : ""}
              </>
            ),
          },
        ]
      : []),
  ];

  const doVoid = async () => {
    try {
      await voidOrder.mutateAsync(order.id);
      message.success("Order voided");
      setConfirmOpen(false);
      onVoided();
    } catch (e) {
      // 409: only-paid / seats-already-claimed. Surface the server message verbatim.
      message.error(serverError(e, "Could not void order"));
    }
  };

  const hit = lookup(STATUS, order.status);

  return (
    <Card
      title={
        <Space>
          {/* The id tail is an identifier — Latin, ratified. */}
          <span>Order <Num>{order.id.slice(-6)}</Num></span>
          {/* Unknown wire value → the NEUTRAL tone and the raw key (ContentStatusChip's
              fallback rule): a state we cannot read must assert nothing. */}
          <MoneyChip tone={hit?.tone ?? "outflow"} label={hit?.label ?? order.status} />
        </Space>
      }
      extra={
        order.status === "paid" ? (
          <Button danger onClick={() => setConfirmOpen(true)}>Void order</Button>
        ) : null
      }
    >
      <Descriptions column={1} size="small" bordered items={items} />

      <Modal
        open={confirmOpen}
        title="Void this order?"
        okText="Void order"
        // Explicit: AppShell's ConfigProvider carries antd's bn_BD locale, so an un-passed
        // cancel button prints «বাতিল» in the middle of an English page.
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
        confirmLoading={voidOrder.isPending}
        onOk={() => void doVoid()}
        onCancel={() => setConfirmOpen(false)}
        destroyOnHidden
      >
        <Typography.Paragraph>{voidEffects(order)}</Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          This cannot be undone.
        </Typography.Paragraph>
      </Modal>
    </Card>
  );
}

// The duplicate-payment queue (D6): the gateway settled the same intent twice, the buyer keeps
// the one entitlement, and the second charge is money the platform owes back out-of-band. There
// is no automated refund — ALL SALES FINAL cuts both ways — so "Mark refunded" is a bookkeeping
// stamp an admin sets AFTER moving the money, not the thing that moves it.
function DuplicatesCard() {
  // AppShell mounts antd's `App` inside the admin ConfigProvider; the imported statics render
  // into their own detached root and cannot see this theme (7g constraint). `modal` comes from
  // the same hook for the same reason — `Modal.confirm` as a static would render unthemed.
  const { message, modal } = App.useApp();
  const dupes = useAdminDuplicates();
  const { data, refetch } = dupes;
  const resolve = useResolveDuplicate();

  const onResolve = async (id: string) => {
    try {
      await resolve.mutateAsync(id);
      message.success("Marked refunded");
    } catch (e) {
      // 409: another admin already stamped it. Server message verbatim, then refetch so the
      // row picks up the resolution that actually won.
      message.error(serverError(e, "Could not resolve"));
      void refetch();
    }
  };

  // Gated behind a confirm for the same reason the void button is: the stamp is IRREVERSIBLE —
  // it writes duplicateResolvedAt/By, a re-resolve answers 409, and there is no unresolve. A
  // misclick in an Action column permanently records a refund that may never have been paid.
  const confirmResolve = (id: string) => {
    modal.confirm({
      title: "Mark this duplicate as refunded?",
      content: (
        <>
          <Typography.Paragraph>
            This records that you already refunded this charge by hand in the gateway&apos;s own
            panel. It does not move any money.
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            This cannot be undone.
          </Typography.Paragraph>
        </>
      ),
      okText: "Mark refunded",
      // Explicit, like the void Modal's: AppShell's ConfigProvider carries antd's bn_BD locale,
      // so an un-passed cancel button prints «বাতিল» in the middle of an English page.
      cancelText: "Cancel",
      onOk: () => onResolve(id),
    });
  };

  const columns: ColumnsType<AdminOrder> = [
    {
      title: "Order",
      dataIndex: "id",
      key: "id",
      // The WHOLE id, not the 6-char tail the detail card's title uses: this column exists to
      // be pasted into the lookup box above it.
      className: "ex-num",
      render: (v: string) => (
        <Typography.Text copyable={{ tooltips: COPY_TOOLTIPS }}>{v}</Typography.Text>
      ),
    },
    { title: "Product", dataIndex: "productTitle", key: "productTitle" },
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
      title: "Gateway txn",
      dataIndex: "gatewayTxnId",
      key: "gatewayTxnId",
      className: "ex-num",
      render: (v: string | null) =>
        v ? <Typography.Text copyable={{ tooltips: COPY_TOOLTIPS }}>{v}</Typography.Text> : "—",
    },
    {
      title: "Paid",
      dataIndex: "paidAt",
      key: "paidAt",
      width: 190,
      className: "ex-num",
      // `|| "—"`: the formatter returns "" on an unparseable instant (house convention), and a
      // blank cell in a money queue reads as "this never happened".
      render: (v: string | null) => (
        <span style={{ whiteSpace: "nowrap" }}>{(v && formatDhakaDateTimeEn(v)) || "—"}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 210,
      // The server list keeps RESOLVED rows — `duplicateResolvedAt` is the only thing that
      // separates outstanding from settled — so the queue shows both and the action column is
      // where the difference reads.
      render: (_, row) =>
        row.duplicateResolvedAt ? (
          <Typography.Text type="secondary" style={{ whiteSpace: "nowrap" }}>
            Refunded {formatDhakaDateTimeEn(row.duplicateResolvedAt) || "—"}
          </Typography.Text>
        ) : (
          <PillButton
            size="sm"
            disabled={resolve.isPending}
            onClick={() => confirmResolve(row.id)}
          >
            Mark refunded
          </PillButton>
        ),
    },
  ];

  // The house three-state shape (see ui/RetryNotice): the branch keys on `!data`, never
  // `isError`, so a failed refetch leaves the held queue on screen under the strip instead of
  // replacing it with an empty table that would read as "nothing to refund".
  return (
    <Card title="Duplicate payments" style={{ marginTop: 16 }}>
      {dupes.isPending ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : !data ? (
        <RetryNotice
          tone="panel"
          busy={dupes.isFetching}
          onRetry={() => void refetch()}
          message="Couldn't load duplicate payments."
          retryLabel="Try again"
        />
      ) : (
        <>
          {dupes.isError && (
            <RetryNotice
              tone="strip"
              busy={dupes.isFetching}
              onRetry={() => void refetch()}
              message="Couldn't refresh — showing the previous data."
              retryLabel="Try again"
            />
          )}
          <Table<AdminOrder>
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={data}
            pagination={false}
            locale={{ emptyText: "No duplicate orders." }}
            scroll={{ x: true }}
          />
        </>
      )}
    </Card>
  );
}

export function OrdersPage() {
  // The submitted (searched) id drives the lookup; the input box is separate so the query fires
  // only on Enter / Search, not on every keystroke.
  const [orderId, setOrderId] = useState("");
  const orderQ = useAdminOrder(orderId);
  const { data, error, refetch } = orderQ;

  const notFound =
    orderQ.isError && (error as AxiosError | undefined)?.response?.status === 404;

  return (
    <>
      <PageHeader
        title="Orders"
        summary="Look up one order by its id. All sales are final — voiding a paid order is the only reversal, and it cannot be undone."
      />

      <Card style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Enter an order id"
          enterButton="Look up"
          allowClear
          onSearch={(v) => setOrderId(v.trim())}
          style={{ maxWidth: 480 }}
        />
      </Card>

      {/* The house three-state shape (see ui/RetryNotice), with the roster page's fourth
          branch: a 404 is a FINAL answer, so it gets a dead-end panel instead of a retry pill
          that would promise a recovery the same successful lookup has already ruled out.
          Everything is gated on a submitted id — an empty box is not a failed lookup. */}
      {orderId &&
        (orderQ.isPending ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : !data ? (
          notFound ? (
            <Card>
              <Typography.Text type="secondary">
                No order with that id. Check the id and search again.
              </Typography.Text>
            </Card>
          ) : (
            <RetryNotice
              tone="panel"
              busy={orderQ.isFetching}
              onRetry={() => void refetch()}
              message="Couldn't load the order."
              retryLabel="Try again"
            />
          )
        ) : (
          <>
            {/* `&& !notFound`: an order that 404s on a REFETCH (it was voided and pruned, or
                the id went stale) leaves the held detail on screen — correct — but the strip
                would then offer a retry against a permanent answer. */}
            {orderQ.isError && !notFound && (
              <RetryNotice
                tone="strip"
                busy={orderQ.isFetching}
                onRetry={() => void refetch()}
                message="Couldn't refresh — showing the previous data."
                retryLabel="Try again"
              />
            )}
            <OrderDetail order={data} onVoided={() => void refetch()} />
          </>
        ))}

      {/* Below the lookup — and below its ANSWER, so a searched order and the box that asked
          for it stay adjacent. With no search running (the usual state of this page) the queue
          sits directly under the lookup card, which is where it reads as the second thing an
          admin comes here to do. */}
      <DuplicatesCard />
    </>
  );
}
