import { useState } from "react";
import {
  Button, Card, Input, Modal, Popconfirm, Segmented, Space, Table, Tag, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useAdminWithdrawals, useMarkPaid, useRejectWithdrawal,
} from "../api/commerce";
import type { Withdrawal } from "../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

const STATUS_COLOR: Record<string, string> = {
  requested: "gold",
  paid: "green",
  rejected: "red",
};

type StatusFilter = "requested" | "paid" | "rejected";

export function WithdrawalsPage() {
  // Pass the status EXPLICITLY on every read — the hook's no-arg default is requested-only, so
  // "paid"/"rejected" would silently fall back to requested if we relied on the default.
  const [status, setStatus] = useState<StatusFilter>("requested");
  const { data, isLoading, isError, refetch } = useAdminWithdrawals(status);
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
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: "Amount",
      dataIndex: "amountBdt",
      key: "amountBdt",
      align: "right",
      render: (v: number) => `৳${v}`,
    },
    { title: "Destination", dataIndex: "destination", key: "destination" },
    {
      title: "Requested",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
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

  return (
    <Card
      title={
        <Typography.Title level={4} style={{ margin: 0 }}>Withdrawals</Typography.Title>
      }
      extra={
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
    >
      <Table<Withdrawal>
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
        locale={{
          emptyText: isError ? "Could not load withdrawals." : `No ${status} withdrawals.`,
        }}
      />

      <Modal
        open={rejectTarget !== null}
        title="Reject withdrawal"
        okText="Reject"
        okButtonProps={{ danger: true }}
        confirmLoading={reject.isPending}
        onOk={submitReject}
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
    </Card>
  );
}
