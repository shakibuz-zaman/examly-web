import { useState } from "react";
import {
  Button, Card, Input, InputNumber, Modal, Space, Statistic, Table, Tag, Tooltip, Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useMyWithdrawals, usePricing, useRequestWithdrawal, useWallet,
} from "../api/commerce";
import type { WalletEntry, Withdrawal } from "../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// Fallback while pricing loads; the platform-configured floor drives the real threshold.
const MIN_WITHDRAWAL_FALLBACK = 500;

const KIND: Record<string, { color: string; label: string }> = {
  sale_credit: { color: "green", label: "Sale" },
  withdrawal_debit: { color: "blue", label: "Withdrawal" },
  void_reversal: { color: "red", label: "Void" },
  withdrawal_reject_reversal: { color: "gold", label: "Reversal" },
};

const WITHDRAWAL_STATUS: Record<string, string> = {
  pending: "gold",
  processing: "blue",
  paid: "green",
  rejected: "red",
};

function SignedAmount({ amount }: { amount: number }) {
  const credit = amount >= 0;
  return (
    <Typography.Text style={{ color: credit ? "var(--ex-teal-ink)" : "#cf1322", fontWeight: 600 }}>
      {credit ? "+" : "−"}৳{Math.abs(amount)}
    </Typography.Text>
  );
}

export function WalletPage() {
  const [page, setPage] = useState(1);
  const { data: wallet, isLoading } = useWallet(page);
  const { data: withdrawals } = useMyWithdrawals();
  const { data: pricing } = usePricing();
  const request = useRequestWithdrawal();

  const minWithdrawal = pricing?.withdrawalMinBdt ?? MIN_WITHDRAWAL_FALLBACK;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [destination, setDestination] = useState("");

  const balance = wallet?.balance ?? 0;
  const canWithdraw = balance >= minWithdrawal;

  const submit = async () => {
    if (!amount || amount < minWithdrawal) {
      message.error(`Minimum ৳${minWithdrawal}`);
      return;
    }
    if (!destination.trim()) {
      message.error("Enter a bKash number");
      return;
    }
    try {
      await request.mutateAsync({ amountBdt: amount, destination: destination.trim() });
      message.success("Withdrawal requested");
      setOpen(false);
      setDestination("");
      setAmount(minWithdrawal);
    } catch (e) {
      message.error(serverError(e, "Withdrawal request failed"));
    }
  };

  const ledgerColumns: ColumnsType<WalletEntry> = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: "Type",
      dataIndex: "kind",
      key: "kind",
      render: (kind: string) => {
        const k = KIND[kind];
        return <Tag color={k?.color}>{k?.label ?? kind}</Tag>;
      },
    },
    {
      title: "Amount",
      dataIndex: "amountBdt",
      key: "amountBdt",
      align: "right",
      render: (amt: number) => <SignedAmount amount={amt} />,
    },
    {
      title: "Reference",
      key: "ref",
      render: (_, e) =>
        e.orderId ? (
          <Typography.Text type="secondary">Order {e.orderId.slice(-6)}</Typography.Text>
        ) : e.withdrawalId ? (
          <Typography.Text type="secondary">Withdrawal {e.withdrawalId.slice(-6)}</Typography.Text>
        ) : (
          "—"
        ),
    },
  ];

  const withdrawalColumns: ColumnsType<Withdrawal> = [
    {
      title: "Requested",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (v: string) => new Date(v).toLocaleString(),
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
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <Tag color={WITHDRAWAL_STATUS[s]}>{s}</Tag>,
    },
    {
      title: "Reason",
      dataIndex: "rejectReason",
      key: "rejectReason",
      render: (v: string | null) => v ?? "—",
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space
          style={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}
          wrap
        >
          <Statistic
            title="Available balance"
            value={balance}
            prefix="৳"
            valueStyle={{ fontSize: 32, color: "var(--ex-teal-ink)" }}
          />
          <Tooltip title={canWithdraw ? "" : `Minimum ৳${minWithdrawal}`}>
            <Button
              type="primary"
              size="large"
              disabled={!canWithdraw}
              onClick={() => {
                setAmount(minWithdrawal);
                setOpen(true);
              }}
            >
              Request withdrawal
            </Button>
          </Tooltip>
        </Space>
      </Card>

      <Card title="Ledger" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          loading={isLoading}
          columns={ledgerColumns}
          dataSource={wallet?.entries ?? []}
          pagination={{
            current: page,
            pageSize: wallet?.pageSize ?? 20,
            total: wallet?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
          }}
          locale={{ emptyText: "No wallet activity yet." }}
        />
      </Card>

      <Card title="Withdrawals">
        <Table
          rowKey="id"
          columns={withdrawalColumns}
          dataSource={withdrawals ?? []}
          pagination={false}
          locale={{ emptyText: "No withdrawal requests yet." }}
        />
      </Card>

      <Modal
        open={open}
        title="Request withdrawal"
        okText="Request"
        confirmLoading={request.isPending}
        onOk={submit}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Typography.Text strong>Amount</Typography.Text>
            <InputNumber
              style={{ width: "100%" }}
              prefix="৳"
              min={minWithdrawal}
              max={balance}
              value={amount}
              onChange={setAmount}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Minimum ৳{minWithdrawal} · available ৳{balance}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text strong>bKash number</Typography.Text>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
