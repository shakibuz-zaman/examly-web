import { useState } from "react";
import { App, Card, InputNumber, Modal, Skeleton, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useMyWithdrawals, usePricing, useRequestWithdrawal, useWallet,
} from "../api/commerce";
import type { WalletEntry, Withdrawal } from "../api/commerce";
import { useAuth } from "../auth/useAuth";
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

// API statuses are requested / processing / paid / payout_failed / rejected (WalletEndpoints /
// Withdrawal domain). `processing` is an approved request the payout gateway is settling —
// queued tone, the same "still moving" cue as `requested`. `payout_failed` is a settlement the
// gateway bounced back; it reads as danger and its কারণ column carries the gateway's own words.
const WITHDRAWAL_STATUS: Record<string, { tone: MoneyTone; label: string }> = {
  requested: { tone: "queued", label: "অপেক্ষমাণ" },
  processing: { tone: "queued", label: "প্রসেস হচ্ছে" },
  paid: { tone: "outflow", label: "পরিশোধিত" },
  payout_failed: { tone: "danger", label: "পেমেন্ট ব্যর্থ" },
  rejected: { tone: "danger", label: "বাতিল" },
};

// The five statuses partition into three money buckets, and the two tiles below name two of
// them. IN_FLIGHT is every NON-TERMINAL payout — requested, processing AND payout_failed: the
// debit is written at REQUEST time and never re-driven per status (WalletService's
// `RequestWithdrawalAsync` inserts the Withdrawal row and its negative WalletEntry in one call;
// approve/processing/failure move `status` but touch no ledger row), so all three are money that
// has already left `balance` and has not come back. `paid` is terminal-out; `rejected` is the
// only status that credits the money back (via `withdrawal_reject_reversal`, the inflow kind
// above) — so it belongs to `balance`, not to either tile. The partition the tiles must keep:
// balance + IN_FLIGHT + paid accounts for every taka, with rejected already folded back into
// balance. If «অপেক্ষমাণ উত্তোলন» summed only `requested`, a processing or payout_failed row's
// money would vanish from every tile while still sitting outside the balance — which is exactly
// the under-report this set closes.
//
// Sums over the payout list, not the ledger, because the ledger cannot tell a queued request
// from a paid one: both are the same `withdrawal_debit`, and only `Withdrawal.status` separates
// them. Both tiles read the one source, so they go «—» together when it is missing rather than
// one of them quietly asserting ৳০.
const IN_FLIGHT_STATUSES = ["requested", "processing", "payout_failed"] as const;

function sumBy(rows: Withdrawal[], statuses: readonly string[]): number {
  return rows.reduce((acc, w) => (statuses.includes(w.status) ? acc + w.amountBdt : acc), 0);
}

export function WalletPage() {
  // AppShell mounts antd's `App` inside the examiner ConfigProvider; the imported statics
  // render into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();
  const { user } = useAuth();
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

  const balance = w?.balance ?? 0;
  const canWithdraw = w != null && balance >= minWithdrawal;

  const submit = async () => {
    if (!amount || amount < minWithdrawal) {
      message.error(`সর্বনিম্ন ${bnMoney(minWithdrawal)} উত্তোলন করা যায়`);
      return;
    }
    // D4: no destination field — the server stamps the payout target from the org owner's
    // verified login phone at admin approval time. The body is amount only.
    try {
      await request.mutateAsync({ amountBdt: amount });
      message.success("উত্তোলনের অনুরোধ পাঠানো হয়েছে");
      setOpen(false);
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
      // The server stamps `bkash:{E.164}` only at admin approval (D4); a still-`requested` row
      // carries "", so strip the transport prefix and go «—» until there is a number to show.
      render: (v: string) => (v ? v.replace(/^bkash:/, "") : "—"),
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
      // Neutral key: this cell renders EITHER field, so it is bound to no single one.
      key: "reason",
      // Two failure texts can land here and neither is ours to translate — same verbatim-render
      // rule as the admin free text. `rejectReason` is what an admin typed rejecting the request
      // (English by D1, or the Bengali balance-race sentence WalletService writes since T7).
      // `payoutFailReason` is the gateway's own words when an APPROVED payout bounced — the
      // examiner's only answer to "where is my money".
      //
      // A single row CAN carry BOTH: RejectWithdrawalAsync accepts a payout_failed → rejected
      // transition and does NOT clear the stale payoutFailReason. So the order is load-bearing,
      // not a "never both" convenience — rejectReason wins because on a rejected-after-failed row
      // the admin's rejection sentence is the current, authoritative reason and the retained
      // payoutFailReason is the older gateway note beneath it.
      render: (_, row) => row.rejectReason ?? row.payoutFailReason ?? "—",
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
            {/* Every IN-FLIGHT payout, not just `requested`: a processing or payout_failed row
                is money already out of the balance and not yet paid or reversed, so it belongs
                here too — summing only `requested` would drop it from every tile. «—» rather
                than ৳০ when the list is missing: zero in-flight and unknown are different facts,
                and this is the tile an examiner checks before asking where their money is. */}
            <StatTile
              label="অপেক্ষমাণ উত্তোলন"
              value={rows ? bnMoney(sumBy(rows, IN_FLIGHT_STATUSES)) : "—"}
            />
            <StatTile
              label="মোট উত্তোলিত"
              value={rows ? bnMoney(sumBy(rows, ["paid"])) : "—"}
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
          {/* D4: the examiner no longer types a destination — the server pays out to the org
              owner's verified login বিকাশ number, resolved at admin approval. So this is a
              read-only statement of where the money goes, not a field. The phone is an
              identifier (Latin digits, ratified); «—» for a legacy doc that carries none.
              INVARIANT (fragile): this prints the REQUESTER's phone (useAuth().user.phone), but
              the server pays the ORG OWNER's phone (Organization.OwnerUserId → users doc). Those
              are the same number only by construction — org creation stamps the creator as owner
              and nothing enforces requester == owner. The first multi-examiner org would make
              this copy name the WRONG number; the durable fix is a server-provided destination
              preview on the request response, not a client-side identity read. Copy itself is
              spec §7 verbatim. */}
          <Typography.Text style={{ color: "var(--ex-ink-soft)" }}>
            টাকা যাবে আপনার লগইন বিকাশ নম্বরে: <span className="ex-num">{user?.phone || "—"}</span>
          </Typography.Text>
        </Space>
      </Modal>
    </>
  );
}
