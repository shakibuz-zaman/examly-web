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
import { bnNum } from "../../lib/bn";

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
  createOrder: (method: string | null) => Promise<CheckoutResponse>;
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
        {/* Matrix axis labels keep Western digits (D8: dense numeric grid, not prose) —
            Bengali carries no plural inflection here, so «৩ পরীক্ষা» needs no `s` branch. */}
        {examSlots.map((e) => (
          <div key={`h${e}`} style={{ textAlign: "center", fontSize: 12, color: "var(--ex-ink-soft)" }}>
            {e} পরীক্ষা
          </div>
        ))}
        {seatSlots.map((s) => (
          <div key={`r${s}`} style={{ display: "contents" }}>
            <div
              style={{
                display: "flex", alignItems: "center", fontSize: 12, color: "var(--ex-ink-soft)",
              }}
            >
              {s} সিট
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
  // `isPending`, not `isLoading` (house rule). `useSlotPurchases` carries no `enabled` guard,
  // so the two are the same state here — the query always runs.
  const { data: purchases, isPending: purchasesPending } = useSlotPurchases();
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

  if (purchasesPending || !pricing) {
    return (
      <Card title="সিট" style={{ marginTop: 16 }}>
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
        title: `${cell.seatSlot} সিট × ${cell.examSlot} পরীক্ষা`,
        priceBdt: cell.priceBdt,
        createOrder: (method) =>
          buy.mutateAsync({ listingId, seatSlot: cell.seatSlot, examSlot: cell.examSlot, method }),
      });
    };

    return (
      <Card
        title={
          <Space>
            <TeamOutlined /> দলগতভাবে বিক্রি (সিট)
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            সিট বান্ডেল কিনে ব্যাচের সাথে আমন্ত্রণ কোড শেয়ার করুন — প্রত্যেক শিক্ষার্থী কোড দিয়ে
            একটি সিট নেবে। একটি প্ল্যান বাছুন:
          </Typography.Text>
          <MatrixGrid
            cells={cells}
            selected={selected}
            onSelect={setSelected}
            disabled={(cell) => cell.examSlot < memberCount}
            reason={() => `এই বান্ডেলে ${bnNum(memberCount)}টি পরীক্ষা আছে`}
            caption={() => null}
          />
          <Button
            type="primary"
            size="large"
            disabled={!selected}
            loading={buy.isPending}
            onClick={onBuy}
          >
            {selected ? `কিনুন — ৳${selected.priceBdt}` : "একটি প্ল্যান বাছুন"}
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
      message.success("আমন্ত্রণ কোড বদলানো হয়েছে — পুরোনো কোড আর কাজ করবে না");
    } catch (e) {
      message.error(serverError(e, "কোড বদলানো যায়নি"));
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
      // Pre-mint (before the picker is shown) routes to the default adapter → method null.
      const res = await upgrade.mutateAsync({ id: purchase.id, body: { ...body, method: null } });
      if ("appliedFree" in res) {
        message.success("স্লট আপগ্রেড হয়েছে — কোনো টাকা লাগেনি");
        setUpgradeSelected(null);
        return;
      }
      // Paid upgrade. The pre-mint (method:null) above ONLY told us it isn't free and gave the
      // price for the sheet — it is NOT handed back, or the buyer's pick would be discarded and
      // they'd silently pay through the default adapter. Once the sheet has a method, ALWAYS
      // re-mint with it: SlotService reuses the pending quote when its provider matches and
      // fails+re-mints when it differs (Provider-staleness check), so this is one cheap POST
      // and the picked method always drives the session the buyer is sent to.
      setSheet({
        title: `আপগ্রেড — ${cell.seatSlot} সিট × ${cell.examSlot} পরীক্ষা`,
        priceBdt: res.amountBdt,
        createOrder: async (method) => {
          const minted = await upgrade.mutateAsync({ id: purchase.id, body: { ...body, method } });
          if ("appliedFree" in minted) {
            // The upgrade became free between attempts (e.g. server state shifted). No payment
            // to collect — bounce the examiner back to a clean slate via the failed-state retry.
            throw new Error("এই আপগ্রেড এখন ফ্রি — প্যানেলটি বন্ধ করে আবার খুলুন।");
          }
          return minted;
        },
      });
    } catch (e) {
      message.error(serverError(e, "আপগ্রেড করা যায়নি"));
    }
  };

  return (
    <Card
      title={
        <Space>
          <TeamOutlined /> সিট
        </Space>
      }
      style={{ marginTop: 16 }}
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Typography.Text strong>
            {purchase.seatSlot} সিট × {purchase.examSlot} পরীক্ষা
          </Typography.Text>
          <Typography.Text type="secondary" style={{ marginInlineStart: 8 }}>
            পরিশোধ ৳{purchase.totalPaidBdt}
          </Typography.Text>
        </div>

        <div>
          {/* Western digits: a used/total tally, the ratified dense-numeric exception (D8). */}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ব্যবহৃত সিট: {purchase.seatsUsed}/{purchase.seatSlot}
          </Typography.Text>
          <Progress percent={Math.round(usedPct)} showInfo={false} />
        </div>

        <div>
          <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
            আমন্ত্রণ কোড
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
              title="আমন্ত্রণ কোড বদলাবেন?"
              description="বর্তমান কোড সঙ্গে সঙ্গে কাজ করা বন্ধ করবে। যারা ইতিমধ্যে সিট নিয়েছে তাদের অ্যাক্সেস থাকবে।"
              okText="বদলান"
              cancelText="না"
              onConfirm={onRotate}
            >
              <Button size="small" loading={rotate.isPending}>
                কোড বদলান
              </Button>
            </Popconfirm>
          </Space>
        </div>

        <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/selling/roster/${purchase.id}`)}>
          রোস্টার পরিচালনা →
        </Button>

        <Divider style={{ margin: "4px 0" }} />

        <div>
          <Typography.Text strong style={{ display: "block" }}>
            আপগ্রেড
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            বড় বান্ডেলে যান — শুধু পার্থক্যটুকু দিতে হবে।
          </Typography.Text>
        </div>
        <MatrixGrid
          cells={cells}
          selected={upgradeSelected}
          onSelect={setUpgradeSelected}
          disabled={(cell) => !isUpgradeCell(cell)}
          reason={() => "আপগ্রেড করতে বড় বান্ডেল বাছুন"}
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
            ? `আপগ্রেড — +৳${Math.max(upgradeSelected.priceBdt - purchase.totalPaidBdt, 0)}`
            : "বড় বান্ডেল বাছুন"}
        </Button>
      </Space>
      {sheetNode}
    </Card>
  );
}
