import { useState } from "react";
import { App, Button, Card, Descriptions, Input, Modal, Skeleton, Space, Typography } from "antd";
import type { DescriptionsProps } from "antd";
import type { AxiosError } from "axios";
import { useAdminOrder, useVoidOrder } from "../api/commerce";
import { enMoney } from "../lib/bn";
import { count, formatDhakaDateTimeEn } from "../lib/format";
import { lookup } from "../lib/lookup";
import { PageHeader } from "../ui/PageHeader";
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
    </>
  );
}
