import { useState } from "react";
import {
  Alert, Button, Card, Descriptions, Input, Modal, Space, Spin, Tag, Typography, message,
} from "antd";
import type { DescriptionsProps } from "antd";
import type { AxiosError } from "axios";
import { useAdminOrder, useVoidOrder } from "../api/commerce";
import type { AdminOrder } from "../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "gold",
  paid: "green",
  failed: "red",
  voided: "default",
};

const KIND_LABEL: Record<string, string> = {
  b2c_purchase: "Student purchase (B2C)",
  b2b_slot: "Seat × exam slot (B2B)",
  b2b_upgrade: "Slot upgrade (B2B)",
};

const taka = (n: number) => `৳${n.toLocaleString("en-US")}`;

function isB2c(order: AdminOrder): boolean {
  return order.kind === "b2c_purchase";
}

// The void-confirmation copy spells out the concrete effects, which differ by order kind.
function voidEffects(order: AdminOrder): string {
  if (isB2c(order)) {
    const share = order.authorShareBdt ?? 0;
    return `Revokes the buyer's access and claws back ${taka(share)} from the author wallet.`;
  }
  return (
    `Rolls back the ${order.seatSlot ?? "?"} × ${order.examSlot ?? "?"} slot purchase for this org. ` +
    "This is refused if any seats have already been claimed — clean the roster first."
  );
}

function OrderDetail({ order, onVoided }: { order: AdminOrder; onVoided: () => void }) {
  const voidOrder = useVoidOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const items: DescriptionsProps["items"] = [
    { key: "kind", label: "Kind", children: KIND_LABEL[order.kind] ?? order.kind },
    { key: "product", label: "Product", children: order.productTitle },
    {
      key: "buyer",
      label: "Buyer",
      children: isB2c(order) ? `Student ${order.studentId ?? "—"}` : `Org ${order.orgId ?? "—"}`,
    },
    { key: "amount", label: "Amount", children: taka(order.amountBdt) },
    ...(isB2c(order)
      ? [
          {
            key: "commission",
            label: "Commission",
            children: order.commissionBdt != null ? taka(order.commissionBdt) : "—",
          },
          {
            key: "share",
            label: "Author share",
            children: order.authorShareBdt != null ? taka(order.authorShareBdt) : "—",
          },
        ]
      : [
          {
            key: "slots",
            label: "Slots",
            children: `${order.seatSlot ?? "?"} seats × ${order.examSlot ?? "?"} exams`,
          },
        ]),
    { key: "created", label: "Created", children: new Date(order.createdAt).toLocaleString() },
    ...(order.paidAt
      ? [{ key: "paid", label: "Paid", children: new Date(order.paidAt).toLocaleString() }]
      : []),
    ...(order.voidedAt
      ? [
          {
            key: "voided",
            label: "Voided",
            children:
              new Date(order.voidedAt).toLocaleString() +
              (order.voidedBy ? ` by ${order.voidedBy}` : ""),
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

  return (
    <Card
      title={
        <Space>
          <span>Order {order.id.slice(-6)}</span>
          <Tag color={STATUS_COLOR[order.status]}>{order.status}</Tag>
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
        okButtonProps={{ danger: true }}
        confirmLoading={voidOrder.isPending}
        onOk={doVoid}
        onCancel={() => setConfirmOpen(false)}
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
  const { data, isLoading, isError, error, refetch } = useAdminOrder(orderId);

  const notFound =
    isError && (error as AxiosError | undefined)?.response?.status === 404;

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>Orders</Typography.Title>
        }
      >
        <Input.Search
          placeholder="Enter an order id"
          enterButton="Look up"
          allowClear
          onSearch={(v) => setOrderId(v.trim())}
          style={{ maxWidth: 480 }}
        />
      </Card>

      {orderId && isLoading && <Spin style={{ display: "block", margin: "48px auto" }} />}

      {orderId && isError && (
        <Alert
          type={notFound ? "warning" : "error"}
          showIcon
          message={notFound ? "No order with that id." : "Could not load the order."}
        />
      )}

      {orderId && data && <OrderDetail order={data} onVoided={() => void refetch()} />}
    </Space>
  );
}
