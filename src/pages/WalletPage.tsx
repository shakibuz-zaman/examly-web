import { useState } from "react";
import { App, Card, Input, InputNumber, Modal, Skeleton, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useMyWithdrawals, usePricing, useRequestWithdrawal, useWallet,
} from "../api/commerce";
import type { WalletEntry, Withdrawal } from "../api/commerce";
import { bnMoney, enMoney } from "../lib/bn";
import { formatDhakaShortBn } from "../lib/format";
import { lookup } from "../lib/lookup";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";
import { MoneyChip, type MoneyTone } from "../ui/StatusChip";
import { StatTile } from "../ui/StatTile";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// Fallback while pricing loads; the platform-configured floor drives the real threshold.
const MIN_WITHDRAWAL_FALLBACK = 500;

// D8: table money is Western digits, so this is `enMoney` — the same rounding, the same
// `en-IN` lakh grouping and the same lifted U+2212 sign as the «৳১,২৩,৪৫৬» in the header and
// the sidebar badge, which are `bnMoney` over that identical string. Sharing the one formatter
// is what makes «৳1,23,456» in a cell and «৳১,২৩,৪৫৬» above it read as one number; this used
// to re-implement the rule and could drift from it.
//
// The only thing left here is the LEDGER's own convention: a ledger column marks direction on
// every row, so a credit gets an explicit `+`. `enMoney` prints no sign for a non-negative
// amount (a price is not a credit), so the plus is prefixed on top of it — and never onto a
// debit, whose «−» the formatter has already placed in front of the ৳.
function tableMoney(amount: number): string {
  const money = enMoney(amount);
  return money.startsWith("−") ? money : `+${money}`;
}

// The two maps below are read through `lookup` (lib/lookup), which is `Object.hasOwn` and
// not truthiness: they are plain object literals and the wire `kind` / `status` are bare
// strings, so a value like "constructor" resolves through Object.prototype to a *function* —
// truthy, and reading `.label` off it hands React undefined inside a chip with an
// `--undefined` modifier. This page carried its own copy of that guard until 7g Task 8
// folded it into the shared one; StatusChip reads the same import for the same reason.
const KIND: Record<string, { tone: MoneyTone; label: string }> = {
  sale_credit: { tone: "inflow", label: "বিক্রয়" },
  withdrawal_debit: { tone: "outflow", label: "উত্তোলন" },
  void_reversal: { tone: "danger", label: "অর্ডার বাতিল" },
  // A rejected payout puts the money BACK in the wallet, so it is an inflow, not a failure —
  // the failure is the `rejected` row in the উত্তোলন table below, which carries the reason.
  withdrawal_reject_reversal: { tone: "inflow", label: "উত্তোলন ফেরত" },
};

// API statuses are exactly requested / paid / rejected (WalletEndpoints / Withdrawal domain).
const WITHDRAWAL_STATUS: Record<string, { tone: MoneyTone; label: string }> = {
  requested: { tone: "queued", label: "অপেক্ষমাণ" },
  paid: { tone: "outflow", label: "পরিশোধিত" },
  rejected: { tone: "danger", label: "বাতিল" },
};

// Sums over the payout list, not the ledger, because the ledger cannot answer either tile:
// `withdrawal_debit` is written at REQUEST time, not at payout — WalletService's
// `RequestWithdrawalAsync` inserts the Withdrawal row and its negative WalletEntry in the same
// call (WalletEntry.cs annotates the kind as "− a withdrawal request"). A queued request and a
// paid one are therefore INDISTINGUISHABLE in the ledger; only `Withdrawal.status` separates
// them.
//
// The consequence any other surface must inherit: ব্যালেন্স ALREADY has queued payouts taken
// out of it. «অপেক্ষমাণ উত্তোলন» is a breakdown of money that has *left* the balance and is
// waiting on an admin — never a pending deduction, and never something to subtract from
// `balance` a second time. (Rejecting a request credits it back through
// `withdrawal_reject_reversal`, which is why that kind reads as an inflow above.)
//
// Both tiles read the one source, so they go «—» together when it is missing rather than one
// of them quietly asserting ৳০.
function sumBy(rows: Withdrawal[], status: string): number {
  return rows.reduce((acc, w) => (w.status === status ? acc + w.amountBdt : acc), 0);
}

export function WalletPage() {
  // AppShell mounts antd's `App` inside the examiner ConfigProvider; the imported statics
  // render into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const wallet = useWallet(page);
  const withdrawals = useMyWithdrawals();
  const { data: pricing } = usePricing();
  const request = useRequestWithdrawal();

  const w = wallet.data;
  const rows = withdrawals.data;
  // The held slice is the previous PAGE of the same wallet — see the keepPreviousData note in
  // api/commerce.ts. Only the entry table is stale under it; `balance` is page-independent.
  const stale = wallet.isPlaceholderData;

  const minWithdrawal = pricing?.withdrawalMinBdt ?? MIN_WITHDRAWAL_FALLBACK;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [destination, setDestination] = useState("");

  const balance = w?.balance ?? 0;
  const canWithdraw = w != null && balance >= minWithdrawal;

  const submit = async () => {
    if (!amount || amount < minWithdrawal) {
      message.error(`সর্বনিম্ন ${bnMoney(minWithdrawal)} উত্তোলন করা যায়`);
      return;
    }
    if (!destination.trim()) {
      message.error("বিকাশ নম্বর দিন");
      return;
    }
    try {
      await request.mutateAsync({ amountBdt: amount, destination: destination.trim() });
      message.success("উত্তোলনের অনুরোধ পাঠানো হয়েছে");
      setOpen(false);
      setDestination("");
      setAmount(minWithdrawal);
    } catch (e) {
      // The server's own sentence leads and it is Bengali as of 7g Task 7 (the three
      // withdrawal gates in WalletService are examiner-reachable, so they were translated);
      // the fallback below is the only half this page owns.
      message.error(serverError(e, "উত্তোলনের অনুরোধ পাঠানো যায়নি"));
    }
  };

  const ledgerColumns: ColumnsType<WalletEntry> = [
    {
      title: "তারিখ",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      // Was `toLocaleString()` — the reader's own locale AND timezone, so an examiner abroad
      // read a different time than the ledger was written in. Dhaka-pinned Bengali now.
      render: (v: string) => <span style={{ whiteSpace: "nowrap" }}>{formatDhakaShortBn(v)}</span>,
    },
    {
      title: "ধরন",
      dataIndex: "kind",
      key: "kind",
      width: 150,
      // An unrecognised kind falls back to the NEUTRAL tone and prints the raw key —
      // ContentStatusChip's archived-fallback rule: a value we cannot read must assert
      // nothing. Amber would have claimed "still queued" about a state we do not know.
      render: (kind: string) => {
        const k = lookup(KIND, kind);
        return <MoneyChip tone={k?.tone ?? "outflow"} label={k?.label ?? kind} />;
      },
    },
    {
      title: "পরিমাণ",
      dataIndex: "amountBdt",
      key: "amountBdt",
      align: "right",
      width: 130,
      className: "ex-num",
      // The ± glyph carries the direction, so the colour is a second cue and never the only
      // one (WCAG 1.4.1). Credits get the green ink; debits stay on plain ink rather than
      // coral, which this page reserves for the two states that actually went wrong.
      render: (amt: number) => (
        <Typography.Text
          style={{ color: amt >= 0 ? "var(--ex-green)" : undefined, fontWeight: 600 }}
        >
          {tableMoney(amt)}
        </Typography.Text>
      ),
    },
    {
      title: "রেফারেন্স",
      key: "ref",
      // Identifiers, so the id tail keeps Latin digits (ratified exception).
      render: (_, e) =>
        e.orderId ? (
          <Typography.Text type="secondary">অর্ডার {e.orderId.slice(-6)}</Typography.Text>
        ) : e.withdrawalId ? (
          <Typography.Text type="secondary">উত্তোলন {e.withdrawalId.slice(-6)}</Typography.Text>
        ) : (
          "—"
        ),
    },
  ];

  const withdrawalColumns: ColumnsType<Withdrawal> = [
    {
      title: "অনুরোধের সময়",
      dataIndex: "requestedAt",
      key: "requestedAt",
      width: 150,
      render: (v: string) => <span style={{ whiteSpace: "nowrap" }}>{formatDhakaShortBn(v)}</span>,
    },
    {
      title: "পরিমাণ",
      dataIndex: "amountBdt",
      key: "amountBdt",
      align: "right",
      width: 120,
      className: "ex-num",
      // Every payout row is a positive request, so the ledger's ± prefix would be noise here —
      // `enMoney` bare is exactly that: same rounding and lakh grouping, no sign in front.
      render: (v: number) => enMoney(v),
    },
    {
      title: "বিকাশ নম্বর",
      dataIndex: "destination",
      key: "destination",
      // A phone number is an identifier — Latin digits, and tabular so a column of them aligns.
      className: "ex-num",
    },
    {
      title: "স্ট্যাটাস",
      dataIndex: "status",
      key: "status",
      width: 120,
      // Neutral fallback, same rule as the ledger's ধরন column above.
      render: (s: string) => {
        const st = lookup(WITHDRAWAL_STATUS, s);
        return <MoneyChip tone={st?.tone ?? "outflow"} label={st?.label ?? s} />;
      },
    },
    {
      title: "কারণ",
      dataIndex: "rejectReason",
      key: "rejectReason",
      // Two kinds of text land in this column and only one of them is ours. A payout the
      // SERVER rejected carries the Bengali compensation sentence it wrote («ব্যালেন্স বদলে
      // গেছে — আবার চেষ্টা করুন।», WalletService's balance-race branch, Bengali since T7). A
      // payout an ADMIN rejected carries whatever that admin typed into the English payout
      // queue, which stays English by D1 — an examiner surface cannot translate free text a
      // human wrote. So this renders verbatim, whichever it is.
      render: (v: string | null) => v ?? "—",
    },
  ];

  return (
    <>
      <PageHeader
        title="ওয়ালেট"
        // The lakh string the ExaminerSidebar badge prints, from the same `bnMoney` and the
        // same `balance` field — the two used to disagree because each carried its own `taka`
        // helper. The minimum rides along because it is the whole reason the pill below can be
        // disabled; a disabled control with no stated threshold is a dead end.
        summary={
          w == null
            ? undefined
            : `ব্যালেন্স ${bnMoney(balance)} · সর্বনিম্ন উত্তোলন ${bnMoney(minWithdrawal)}`
        }
        actions={
          <PillButton
            variant="primary"
            disabled={!canWithdraw}
            onClick={() => {
              setAmount(minWithdrawal);
              setOpen(true);
            }}
          >
            উত্তোলনের অনুরোধ
          </PillButton>
        }
      />

      {/* Three states, the shape OrgDashboard settled on. The branch keys on `!w`, never
          `isError`: TanStack keeps `data` through a same-key refetch failure, so the balance
          and ledger we already hold stay on screen under the strip instead of being thrown
          away for a panel that says we have nothing. */}
      {/* The success path's rhythm comes from the লেনদেন card's own 12px bottom margin. Neither
          the skeleton nor the panel Card carries one, so both non-success branches sat flush
          against the উত্তোলন card below and read as a single box — measured 0px against the
          success path's 12px, so the wrapper goes on BOTH of them, not just the error one. */}
      {wallet.isPending ? (
        <div style={{ marginBottom: 12 }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : !w ? (
        <div style={{ marginBottom: 12 }}>
          <RetryNotice tone="panel" busy={wallet.isFetching} onRetry={() => void wallet.refetch()} />
        </div>
      ) : (
        <>
          {wallet.isError && (
            <RetryNotice
              tone="strip"
              busy={wallet.isFetching}
              onRetry={() => void wallet.refetch()}
            />
          )}
          <div className="ex-stattiles ex-stattiles--3">
            <StatTile label="ব্যালেন্স" value={bnMoney(balance)} />
            {/* «—» rather than ৳০ when the payout list is missing: zero queued and unknown
                are different facts, and this tile is the one an examiner checks before
                asking where their money is. */}
            <StatTile
              label="অপেক্ষমাণ উত্তোলন"
              value={rows ? bnMoney(sumBy(rows, "requested")) : "—"}
            />
            <StatTile
              label="মোট উত্তোলিত"
              value={rows ? bnMoney(sumBy(rows, "paid")) : "—"}
            />
          </div>

          <Card title="লেনদেন" style={{ marginTop: 12, marginBottom: 12 }}>
            {/* saturate, never opacity (house rule), and aria-busy so the same fact reaches
                AT. Because the slice is held, the pager stays MOUNTED across a page step. */}
            <div
              style={{ filter: stale ? "saturate(0.35)" : undefined, transition: "filter .2s" }}
              aria-busy={stale}
            >
              <Table<WalletEntry>
                size="small"
                rowKey="id"
                columns={ledgerColumns}
                dataSource={w.entries}
                pagination={{
                  current: page,
                  pageSize: w.pageSize,
                  total: w.total,
                  onChange: setPage,
                  showSizeChanger: false,
                }}
                locale={{ emptyText: stale ? "লোড হচ্ছে…" : "ওয়ালেটে এখনো কোনো লেনদেন নেই।" }}
                scroll={{ x: true }}
              />
            </div>
          </Card>
        </>
      )}

      <Card title="উত্তোলন">
        {withdrawals.isPending ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : !rows ? (
          // framed={false}: this notice IS the card body, so a second bordered box inside the
          // first would only draw a frame around a frame.
          <RetryNotice
            tone="panel"
            framed={false}
            busy={withdrawals.isFetching}
            onRetry={() => void withdrawals.refetch()}
          />
        ) : (
          <>
            {withdrawals.isError && (
              <RetryNotice
                tone="strip"
                busy={withdrawals.isFetching}
                onRetry={() => void withdrawals.refetch()}
              />
            )}
            <Table<Withdrawal>
              size="small"
              rowKey="id"
              columns={withdrawalColumns}
              dataSource={rows}
              pagination={false}
              locale={{ emptyText: "এখনো কোনো উত্তোলনের অনুরোধ নেই।" }}
              scroll={{ x: true }}
            />
          </>
        )}
      </Card>

      <Modal
        open={open}
        title="উত্তোলনের অনুরোধ"
        okText="অনুরোধ পাঠান"
        cancelText="বাতিল"
        confirmLoading={request.isPending}
        onOk={() => void submit()}
        onCancel={() => setOpen(false)}
        destroyOnHidden
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Typography.Text strong>পরিমাণ</Typography.Text>
            <InputNumber
              style={{ width: "100%" }}
              prefix="৳"
              min={minWithdrawal}
              max={balance}
              value={amount}
              onChange={setAmount}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              সর্বনিম্ন {bnMoney(minWithdrawal)} · ব্যালেন্স {bnMoney(balance)}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text strong>বিকাশ নম্বর</Typography.Text>
            {/* The placeholder stays Latin — it is the shape of an identifier the examiner
                types on a Latin-digit keypad, not prose. */}
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </Space>
      </Modal>
    </>
  );
}
