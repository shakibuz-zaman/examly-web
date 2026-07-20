import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Card, Divider, Popconfirm, Progress, Space, Spin, Tooltip, Typography, message,
} from "antd";
import { TeamOutlined } from "@ant-design/icons";
import type { AxiosError } from "axios";
import { CheckoutSheet } from "../../components/CheckoutSheet";
import {
  useBuySlots, useListing, usePricing, useRotateCode, useSlotPurchases, useUpgradeSlots,
} from "../../api/commerce";
import type { CheckoutResponse, MatrixCell, SlotPurchase } from "../../api/commerce";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

type Props = {
  productType: string; // "model_test" | "exam" — selects the pricing matrix + gates standalone.
  productId: string;
  // The bundle's exam count (model tests). Standalone exams pass 1. Cells that can't cover every
  // exam (examSlot < memberCount) are disabled.
  memberCount: number;
};

type SheetState = {
  title: string;
  priceBdt: number;
  createOrder: () => Promise<CheckoutResponse>;
};

// A clickable seat×exam price grid. Cells render their price (buy) or the upgrade delta caption;
// `disabled(cell)` greys a cell out with `reason(cell)` as a tooltip.
function MatrixGrid({
  cells, selected, onSelect, disabled, reason, caption,
}: {
  cells: MatrixCell[];
  selected: MatrixCell | null;
  onSelect: (cell: MatrixCell) => void;
  disabled: (cell: MatrixCell) => boolean;
  reason: (cell: MatrixCell) => string | null;
  caption: (cell: MatrixCell) => string | null;
}) {
  const seatSlots = [...new Set(cells.map((c) => c.seatSlot))].sort((a, b) => a - b);
  const examSlots = [...new Set(cells.map((c) => c.examSlot))].sort((a, b) => a - b);
  const cellAt = (s: number, e: number) => cells.find((c) => c.seatSlot === s && c.examSlot === e);

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `72px repeat(${examSlots.length}, minmax(88px, 1fr))`,
          gap: 8,
          minWidth: 72 + examSlots.length * 96,
        }}
      >
        <div />
        {examSlots.map((e) => (
          <div key={`h${e}`} style={{ textAlign: "center", fontSize: 12, color: "var(--ex-ink-soft)" }}>
            {e} exam{e > 1 ? "s" : ""}
          </div>
        ))}
        {seatSlots.map((s) => (
          <div key={`r${s}`} style={{ display: "contents" }}>
            <div
              style={{
                display: "flex", alignItems: "center", fontSize: 12, color: "var(--ex-ink-soft)",
              }}
            >
              {s} seats
            </div>
            {examSlots.map((e) => {
              const cell = cellAt(s, e);
              if (!cell) return <div key={`${s}-${e}`} />;
              const isDisabled = disabled(cell);
              const isSelected =
                selected?.seatSlot === cell.seatSlot && selected?.examSlot === cell.examSlot;
              const cap = caption(cell);
              const body = (
                <div
                  role="button"
                  aria-disabled={isDisabled}
                  onClick={isDisabled ? undefined : () => onSelect(cell)}
                  style={{
                    border: `1.5px solid ${isSelected ? "var(--ex-teal-ink)" : "var(--ex-line)"}`,
                    background: isSelected ? "var(--ex-teal-tint)" : "transparent",
                    borderRadius: 10,
                    padding: "10px 6px",
                    textAlign: "center",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.4 : 1,
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--ex-ink)" }}>৳{cell.priceBdt}</div>
                  {cap && (
                    <div style={{ fontSize: 11, color: "var(--ex-teal-ink)", marginTop: 2 }}>{cap}</div>
                  )}
                </div>
              );
              const tip = isDisabled ? reason(cell) : null;
              return (
                <Tooltip key={`${s}-${e}`} title={tip}>
                  {body}
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeatsPanel({ productType, productId, memberCount }: Props) {
  const navigate = useNavigate();
  const { data: listing } = useListing(productType, productId);
  const { data: pricing } = usePricing();
  const { data: purchases, isLoading: purchasesLoading } = useSlotPurchases();
  const buy = useBuySlots();
  const upgrade = useUpgradeSlots();

  const [selected, setSelected] = useState<MatrixCell | null>(null);
  const [upgradeSelected, setUpgradeSelected] = useState<MatrixCell | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);

  // Derived before any early return so the hooks below stay unconditional (rules of hooks).
  const listingId = listing?.id ?? "";
  const cells: MatrixCell[] =
    (productType === "model_test" ? pricing?.modelTestMatrix : pricing?.standalonePrices) ?? [];
  const purchase: SlotPurchase | undefined = purchases?.find((p) => p.listingId === listingId);
  const rotate = useRotateCode(purchase?.id ?? "");

  // Seats are sold only for privately-reachable listings (invite / seat code). Public-only
  // listings sell one seat at a time through the B2C storefront, so no panel.
  if (!listing || (listing.visibility !== "private" && listing.visibility !== "both")) return null;

  if (purchasesLoading || !pricing) {
    return (
      <Card title="Seats" style={{ marginTop: 16 }}>
        <Spin />
      </Card>
    );
  }

  const sheetNode = sheet && (
    <CheckoutSheet
      open
      onClose={() => setSheet(null)}
      listingId={listingId}
      title={sheet.title}
      priceBdt={sheet.priceBdt}
      createOrder={sheet.createOrder}
      onPurchased={() => {
        setSelected(null);
        setUpgradeSelected(null);
      }}
    />
  );

  // ---- No purchase yet → buy a seat bundle ----
  if (!purchase) {
    const onBuy = () => {
      if (!selected) return;
      const cell = selected;
      setSheet({
        title: `${cell.seatSlot} seats × ${cell.examSlot} exam${cell.examSlot > 1 ? "s" : ""}`,
        priceBdt: cell.priceBdt,
        createOrder: () =>
          buy.mutateAsync({ listingId, seatSlot: cell.seatSlot, examSlot: cell.examSlot }),
      });
    };

    return (
      <Card
        title={
          <Space>
            <TeamOutlined /> Sell to a group (seats)
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Buy a seat bundle, then share the invite code with your batch — each student claims a
            seat with the code. Pick a plan:
          </Typography.Text>
          <MatrixGrid
            cells={cells}
            selected={selected}
            onSelect={setSelected}
            disabled={(cell) => cell.examSlot < memberCount}
            reason={() => `This bundle has ${memberCount} exams`}
            caption={() => null}
          />
          <Button
            type="primary"
            size="large"
            disabled={!selected}
            loading={buy.isPending}
            onClick={onBuy}
          >
            {selected ? `Buy — ৳${selected.priceBdt}` : "Select a plan"}
          </Button>
        </Space>
        {sheetNode}
      </Card>
    );
  }

  // ---- Purchased → summary + roster link + upgrade ----
  const usedPct = purchase.seatSlot > 0 ? (purchase.seatsUsed / purchase.seatSlot) * 100 : 0;

  const onRotate = async () => {
    try {
      await rotate.mutateAsync();
      message.success("Invite code rotated — the old code no longer works");
    } catch (e) {
      message.error(serverError(e, "Could not rotate the code"));
    }
  };

  const isUpgradeCell = (cell: MatrixCell) =>
    cell.seatSlot >= purchase.seatSlot &&
    cell.examSlot >= purchase.examSlot &&
    (cell.seatSlot > purchase.seatSlot || cell.examSlot > purchase.examSlot);

  // Upgrade branches on the SERVER's discriminator, never the client's delta (the cached matrix
  // price can be stale in either direction). Always mint the upgrade first: if the server applied
  // it free → confirm and stop; otherwise hand the ALREADY-CREATED order to the checkout sheet.
  // The `+৳delta` on the cells is only a caption hint (see MatrixGrid `caption` below).
  const onUpgrade = async () => {
    if (!upgradeSelected) return;
    const cell = upgradeSelected;
    const body = { seatSlot: cell.seatSlot, examSlot: cell.examSlot };
    try {
      const res = await upgrade.mutateAsync({ id: purchase.id, body });
      if ("appliedFree" in res) {
        message.success("Slots upgraded — no payment needed");
        setUpgradeSelected(null);
        return;
      }
      // Paid upgrade. The pending order already exists, so the sheet must NOT re-mint on its
      // first checkout — it consumes this held response. A retry after a failed payment falls
      // through to a fresh mutateAsync; the server reuses/re-mints the pending order correctly.
      let held: CheckoutResponse | null = res;
      setSheet({
        title: `Upgrade — ${cell.seatSlot} seats × ${cell.examSlot} exam${cell.examSlot > 1 ? "s" : ""}`,
        priceBdt: res.amountBdt,
        createOrder: async () => {
          if (held) {
            const first = held;
            held = null;
            return first;
          }
          const retry = await upgrade.mutateAsync({ id: purchase.id, body });
          if ("appliedFree" in retry) {
            // The upgrade became free between attempts (e.g. server state shifted). No payment
            // to collect — bounce the examiner back to a clean slate via the failed-state retry.
            throw new Error("This upgrade is now free — close and reopen the panel.");
          }
          return retry;
        },
      });
    } catch (e) {
      message.error(serverError(e, "Upgrade failed"));
    }
  };

  return (
    <Card
      title={
        <Space>
          <TeamOutlined /> Seats
        </Space>
      }
      style={{ marginTop: 16 }}
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Text strong>
            {purchase.seatSlot} seats × {purchase.examSlot} exam{purchase.examSlot > 1 ? "s" : ""}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ marginInlineStart: 8 }}>
            paid ৳{purchase.totalPaidBdt}
          </Typography.Text>
        </div>

        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Seats used: {purchase.seatsUsed}/{purchase.seatSlot}
          </Typography.Text>
          <Progress percent={Math.round(usedPct)} showInfo={false} />
        </div>

        <div>
          <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
            Invite code
          </Typography.Text>
          <Space wrap>
            <Typography.Text
              copyable={{ text: purchase.inviteCode }}
              code
              style={{ fontSize: 15 }}
            >
              {purchase.inviteCode}
            </Typography.Text>
            <Popconfirm
              title="Rotate the invite code?"
              description="The current code stops working immediately. Already-claimed seats keep access."
              okText="Rotate"
              onConfirm={onRotate}
            >
              <Button size="small" loading={rotate.isPending}>
                Rotate
              </Button>
            </Popconfirm>
          </Space>
        </div>

        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/selling/roster/${purchase.id}`)}>
          Manage roster →
        </Button>

        <Divider style={{ margin: "4px 0" }} />

        <div>
          <Typography.Text strong style={{ display: "block" }}>
            Upgrade
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Move to a bigger bundle — you only pay the difference.
          </Typography.Text>
        </div>
        <MatrixGrid
          cells={cells}
          selected={upgradeSelected}
          onSelect={setUpgradeSelected}
          disabled={(cell) => !isUpgradeCell(cell)}
          reason={() => "Pick a larger bundle to upgrade"}
          caption={(cell) =>
            isUpgradeCell(cell) ? `+৳${Math.max(cell.priceBdt - purchase.totalPaidBdt, 0)}` : null
          }
        />
        <Button
          type="primary"
          disabled={!upgradeSelected}
          loading={upgrade.isPending}
          onClick={onUpgrade}
        >
          {upgradeSelected
            ? `Upgrade — +৳${Math.max(upgradeSelected.priceBdt - purchase.totalPaidBdt, 0)}`
            : "Select a bigger bundle"}
        </Button>
      </Space>
      {sheetNode}
    </Card>
  );
}
