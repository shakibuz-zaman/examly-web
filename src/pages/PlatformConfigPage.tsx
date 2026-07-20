import { useState } from "react";
import {
  Alert, Button, Card, InputNumber, Space, Spin, Table, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import { usePlatformConfig, useSavePlatformConfig } from "../api/commerce";
import type { MatrixCell, Pricing } from "../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

// Return a new cell list with the (seat, exam) cell's price replaced.
function withCellPrice(
  cells: MatrixCell[], seat: number, exam: number, price: number,
): MatrixCell[] {
  return cells.map((c) =>
    c.seatSlot === seat && c.examSlot === exam ? { ...c, priceBdt: price } : c);
}

// The model-test grid: one row per seat slot, one editable column per exam slot.
function MatrixEditor({
  cells, onCellChange,
}: {
  cells: MatrixCell[];
  onCellChange: (seat: number, exam: number, price: number) => void;
}) {
  const seatSlots = uniqueSorted(cells.map((c) => c.seatSlot));
  const examSlots = uniqueSorted(cells.map((c) => c.examSlot));
  const priceOf = (seat: number, exam: number) =>
    cells.find((c) => c.seatSlot === seat && c.examSlot === exam)?.priceBdt ?? null;

  type Row = { key: number; seat: number };
  const columns: ColumnsType<Row> = [
    {
      title: "Seats / Exams",
      dataIndex: "seat",
      fixed: "left",
      render: (seat: number) => <strong>{seat}</strong>,
    },
    ...examSlots.map((exam) => ({
      title: `${exam} exams`,
      key: `exam-${exam}`,
      align: "right" as const,
      render: (_: unknown, row: Row) => (
        <InputNumber
          size="small"
          prefix="৳"
          min={0}
          style={{ width: 120 }}
          value={priceOf(row.seat, exam)}
          onChange={(v) => onCellChange(row.seat, exam, v ?? 0)}
        />
      ),
    })),
  ];
  const data: Row[] = seatSlots.map((seat) => ({ key: seat, seat }));

  return (
    <Table<Row>
      size="small"
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: true }}
    />
  );
}

// The standalone (single-exam) prices: one editable row per seat slot.
function StandaloneEditor({
  cells, onCellChange,
}: {
  cells: MatrixCell[];
  onCellChange: (seat: number, exam: number, price: number) => void;
}) {
  const rows = [...cells].sort((a, b) => a.seatSlot - b.seatSlot);
  return (
    <Table<MatrixCell>
      size="small"
      pagination={false}
      rowKey={(r) => String(r.seatSlot)}
      dataSource={rows}
      columns={[
        {
          title: "Seats",
          dataIndex: "seatSlot",
          render: (v: number) => <strong>{v}</strong>,
        },
        {
          title: "Price",
          dataIndex: "priceBdt",
          align: "right",
          render: (_: unknown, cell) => (
            <InputNumber
              size="small"
              prefix="৳"
              min={0}
              style={{ width: 140 }}
              value={cell.priceBdt}
              onChange={(v) => onCellChange(cell.seatSlot, cell.examSlot, v ?? 0)}
            />
          ),
        },
      ]}
    />
  );
}

export function PlatformConfigPage() {
  const { data, isLoading, isError } = usePlatformConfig();
  const save = useSavePlatformConfig();

  // Editable draft, seeded from the server config. React's "adjust state during render" pattern
  // (not an effect): when a fresh config object arrives, re-seed the draft from it. Tracking the
  // source identity means later refetches of the same data don't clobber in-progress edits.
  const [draft, setDraft] = useState<Pricing | null>(null);
  const [seededFrom, setSeededFrom] = useState<Pricing | null>(null);
  if (data && data !== seededFrom) {
    setSeededFrom(data);
    setDraft(data);
  }

  const updateModelCell = (seat: number, exam: number, price: number) =>
    setDraft((d) => (d ? { ...d, modelTestMatrix: withCellPrice(d.modelTestMatrix, seat, exam, price) } : d));
  const updateStandaloneCell = (seat: number, exam: number, price: number) =>
    setDraft((d) => (d ? { ...d, standalonePrices: withCellPrice(d.standalonePrices, seat, exam, price) } : d));

  const onSave = async () => {
    if (!draft) return;
    try {
      await save.mutateAsync(draft);
      message.success("Platform config saved");
    } catch (e) {
      message.error(serverError(e, "Save failed"));
    }
  };

  if (isLoading) return <Spin style={{ display: "block", margin: "48px auto" }} />;
  if (isError || !draft) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load the platform config. Please try again."
      />
    );
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>Platform config</Typography.Title>
        }
        extra={
          <Button type="primary" loading={save.isPending} onClick={onSave}>
            Save
          </Button>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          B2B seat × exam price matrix, the B2C marketplace commission, the price floor and the
          withdrawal minimum. One Save writes the whole config.
        </Typography.Paragraph>
      </Card>

      <Card title="Model-test packages (seats × exams)">
        <MatrixEditor cells={draft.modelTestMatrix} onCellChange={updateModelCell} />
      </Card>

      <Card title="Standalone (single-exam) prices">
        <StandaloneEditor cells={draft.standalonePrices} onCellChange={updateStandaloneCell} />
      </Card>

      <Card title="Rates & limits">
        <Space size="large" wrap>
          <div>
            <Typography.Text strong>Commission rate (0–1)</Typography.Text>
            <div>
              <InputNumber
                min={0}
                max={1}
                step={0.01}
                style={{ width: 160 }}
                value={draft.commissionRate}
                onChange={(v) => setDraft((d) => (d ? { ...d, commissionRate: v ?? 0 } : d))}
              />
            </div>
          </div>
          <div>
            <Typography.Text strong>Price floor</Typography.Text>
            <div>
              <InputNumber
                min={0}
                prefix="৳"
                style={{ width: 160 }}
                value={draft.priceFloorBdt}
                onChange={(v) => setDraft((d) => (d ? { ...d, priceFloorBdt: v ?? 0 } : d))}
              />
            </div>
          </div>
          <div>
            <Typography.Text strong>Withdrawal minimum</Typography.Text>
            <div>
              <InputNumber
                min={0}
                prefix="৳"
                style={{ width: 160 }}
                value={draft.withdrawalMinBdt}
                onChange={(v) => setDraft((d) => (d ? { ...d, withdrawalMinBdt: v ?? 0 } : d))}
              />
            </div>
          </div>
        </Space>
      </Card>
    </Space>
  );
}
