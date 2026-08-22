import { useState } from "react";
import { App, Card, InputNumber, Skeleton, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import { usePlatformConfig, useSavePlatformConfig } from "../api/commerce";
import type { MatrixCell, Pricing } from "../api/commerce";
import { count } from "../lib/format";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";

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
      // Every cell in this grid is a number, so the whole table is tabular — a seat count in
      // the row head that does not line up with the one below it makes the matrix harder to
      // scan than a plain list.
      className: "ex-num",
      render: (seat: number) => <strong>{seat}</strong>,
    },
    ...examSlots.map((exam) => ({
      title: count(exam, "exam", "exams"),
      key: `exam-${exam}`,
      align: "right" as const,
      className: "ex-num",
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
          className: "ex-num",
          render: (v: number) => <strong>{v}</strong>,
        },
        {
          title: "Price",
          dataIndex: "priceBdt",
          align: "right",
          className: "ex-num",
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
  // AppShell mounts antd's `App` inside the examiner/admin ConfigProvider; the imported
  // statics render into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
  const configQ = usePlatformConfig();
  const save = useSavePlatformConfig();
  const { data } = configQ;

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

  return (
    <>
      <PageHeader
        title="Platform config"
        summary={
          <>
            {/* The counts describe the SHAPE of the matrix, which no edit on this page can
                change — a price cell can be repriced but not added — so reading them off the
                draft rather than the server response cannot make the line claim something
                unsaved. */}
            {draft && (
              <div>
                {count(draft.modelTestMatrix.length, "model-test price", "model-test prices")}
                {" · "}
                {count(draft.standalonePrices.length, "standalone price", "standalone prices")}
              </div>
            )}
            <div>
              One Save writes the whole config: the B2B seat × exam matrix, the B2C marketplace
              commission, the price floor and the withdrawal minimum.
            </div>
          </>
        }
        actions={
          <PillButton
            variant="primary"
            // Nothing loaded means nothing to save; the PUT would go out with an empty body.
            disabled={!draft || save.isPending}
            onClick={() => void onSave()}
          >
            {save.isPending ? "Saving…" : "Save"}
          </PillButton>
        }
      />

      {/* The house three-state shape (see ui/RetryNotice), which this page was the last
          holdout from: it used to branch on `isError || !draft` straight into a dead-end
          Alert, so a same-key refetch failure threw away a config the admin might have been
          part-way through editing. The branch keys on `!draft`, never `isError` — and `draft`
          is non-null exactly when a config has ever arrived, since it is seeded from `data`
          above and never cleared. Copy is English throughout (D1). */}
      {configQ.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !draft ? (
        <RetryNotice
          tone="panel"
          busy={configQ.isFetching}
          onRetry={() => void configQ.refetch()}
          message="Couldn't load platform config."
          retryLabel="Try again"
        />
      ) : (
        <>
          {configQ.isError && (
            <RetryNotice
              tone="strip"
              busy={configQ.isFetching}
              onRetry={() => void configQ.refetch()}
              message="Couldn't refresh — showing the previous data."
              retryLabel="Try again"
            />
          )}

          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
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
                      className="ex-num"
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
                      className="ex-num"
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
                      className="ex-num"
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
        </>
      )}
    </>
  );
}
