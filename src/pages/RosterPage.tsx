import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, App, Button, Card, Input, Modal, Skeleton, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { AxiosError } from "axios";
import {
  useAddAllowlist, useRevokeMember, useRoster, useRotateCode, useSlotPurchases,
} from "../api/commerce";
import type { AllowlistReport, AllowlistRow, RosterMember } from "../api/commerce";
import { bnNum } from "../lib/bn";
import { formatDhakaShortBn } from "../lib/format";
import { PageHeader } from "../ui/PageHeader";
import { PillButton } from "../ui/PillButton";
import { RetryNotice } from "../ui/RetryNotice";
import { SeatChip } from "../ui/StatusChip";
import { StatTile } from "../ui/StatTile";

function serverError(e: unknown, fallback: string): string {
  return (e as AxiosError<{ error?: string }>).response?.data?.error ?? fallback;
}

// "01712345678, Rahim Uddin" → { phone: "01712345678", name: "Rahim Uddin" }. Name is optional.
// Byte-unchanged from the pre-rebuild page: the wire shape `useAddAllowlist` posts is frozen.
function parseRows(text: string): AllowlistRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(",");
      if (comma === -1) return { phone: line, name: null };
      return { phone: line.slice(0, comma).trim(), name: line.slice(comma + 1).trim() || null };
    });
}

// Provenance, not state — so it is plain secondary text rather than a third chip beside the
// seat chip. `Object.hasOwn`, not truthiness: `source` is a bare wire string, so a value like
// "constructor" resolves through Object.prototype to a *function*, which React throws on as a
// child (the guard StatusChip and WalletPage both record). An unread value prints raw.
const SOURCE: Record<string, string> = {
  allowlist: "তালিকাভুক্ত", // the org pre-registered this phone
  code: "কোড", //             the student redeemed the invite code
};
function sourceLabel(source: string): string {
  return Object.hasOwn(SOURCE, source) ? SOURCE[source] : source;
}

export function RosterPage() {
  const { slotPurchaseId } = useParams<{ slotPurchaseId: string }>();
  const navigate = useNavigate();
  // AppShell mounts antd's `App` inside the examiner ConfigProvider; the imported statics
  // render into their own detached root and cannot see this theme (7g constraint).
  const { message } = App.useApp();

  const rosterQ = useRoster(slotPurchaseId);
  const purchasesQ = useSlotPurchases();
  const addAllowlist = useAddAllowlist(slotPurchaseId ?? "");
  const revoke = useRevokeMember(slotPurchaseId ?? "");
  const rotate = useRotateCode(slotPurchaseId ?? "");

  const [addOpen, setAddOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [report, setReport] = useState<AllowlistReport | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [revokeRow, setRevokeRow] = useState<RosterMember | null>(null);

  const roster = rosterQ.data;
  const purchase = purchasesQ.data?.find((p) => p.id === slotPurchaseId);

  // `useRoster` sets `retry: false` precisely because a 404 here is permanent — a foreign or
  // deleted slot purchase. That branch gets its own dead-end panel instead of RetryNotice,
  // whose «আবার চেষ্টা করুন» would invite an unbounded retry loop against a fixed answer.
  const notFound =
    (rosterQ.error as AxiosError | null)?.response?.status === 404;

  const seatsUsed = roster?.seatsUsed ?? 0;
  const seatSlot = roster?.seatSlot ?? 0;
  const seatsFree = Math.max(seatSlot - seatsUsed, 0);
  const seatsFull = roster != null && seatSlot > 0 && seatsUsed >= seatSlot;

  // Counts in chrome prose → Bengali numerals (D8 keeps Western digits for dense numeric
  // table cells, which is a different job). The product title rides in front because the
  // breadcrumb only says «বিক্রয় / রোস্টার» — without it nothing on the page names WHICH
  // slot purchase this roster belongs to.
  const tally = `${bnNum(seatsUsed)}/${bnNum(seatSlot)} সিট ব্যবহৃত`;
  const summary = roster == null
    ? undefined
    : purchase
      ? `${purchase.productTitle} · ${tally}`
      : tally;

  const copyCode = async (code: string) => {
    try {
      // Throws (or rejects) on an insecure origin, where `navigator.clipboard` is undefined;
      // both land in the catch, so the examiner is told to copy by hand rather than being
      // left with a button that silently did nothing.
      await navigator.clipboard.writeText(code);
      message.success("আমন্ত্রণ কোড কপি হয়েছে");
    } catch {
      message.error("কপি করা যায়নি — কোডটি বেছে নিয়ে কপি করুন");
    }
  };

  const submitAdd = async () => {
    const rows = parseRows(raw);
    if (rows.length === 0) {
      message.error("অন্তত একটি ফোন নম্বর দিন");
      return;
    }
    try {
      const res = await addAllowlist.mutateAsync(rows);
      // Held on the page rather than inside the modal: the per-row failures are the half an
      // examiner has to act on (fix a mistyped number and re-add), and a toast is gone before
      // a list of them can be read. The happy half rides the toast.
      setReport(res.errors.length > 0 ? res : null);
      setRaw("");
      setAddOpen(false);
      // Three outcomes, three tones — `added === 0` must never wear the green check. A submit
      // of nothing but bad numbers answered «০টি নম্বর যোগ হয়েছে» in success green, which is
      // a success chrome over a total failure. The two zero-added cases are also different
      // facts and cannot share copy: with row errors the Alert below carries the reason, and
      // the toast points at it; with none, every line was a duplicate and there IS no list
      // below (the report is only held when `errors` is non-empty), so the count says it.
      if (res.added > 0) {
        message.success(
          res.skipped > 0
            ? `${bnNum(res.added)}টি নম্বর যোগ হয়েছে · ${bnNum(res.skipped)}টি আগে থেকেই ছিল`
            : `${bnNum(res.added)}টি নম্বর যোগ হয়েছে`,
        );
      } else if (res.errors.length > 0) {
        message.warning("কোনো নম্বর যোগ হয়নি — নিচের তালিকা দেখুন");
      } else {
        message.warning(`কোনো নতুন নম্বর যোগ হয়নি — ${bnNum(res.skipped)}টি আগে থেকেই ছিল`);
      }
    } catch (e) {
      // The mutation never landed, so the PREVIOUS submit's report is now stale chrome sitting
      // above an unchanged table — clear it rather than leave counts that describe a different
      // request. The server's roster strings are still English until Task 7; this fallback is
      // the only half the page owns, and it is Bengali.
      setReport(null);
      message.error(serverError(e, "তালিকায় যোগ করা যায়নি"));
    }
  };

  const submitRotate = () => {
    rotate.mutate(undefined, {
      onSuccess: () => {
        message.success("আমন্ত্রণ কোড বদলানো হয়েছে — পুরোনো কোড আর কাজ করবে না");
        setRotateOpen(false);
      },
      onError: (e) => message.error(serverError(e, "কোড বদলানো যায়নি")),
    });
  };

  // Mutation shape frozen (revoke-as-election + the seat $inc live on the server): still one
  // `mutate(memberId)`. Only the confirm chrome moved — from a Popconfirm to the controlled
  // Modal this branch settled on — and the `onError` toast is additive.
  const submitRevoke = () => {
    if (!revokeRow) return;
    revoke.mutate(revokeRow.id, {
      onSuccess: () => {
        message.success("রোস্টার থেকে সরানো হয়েছে");
        setRevokeRow(null);
      },
      onError: (e) => message.error(serverError(e, "সরানো যায়নি")),
    });
  };

  const columns: ColumnsType<RosterMember> = [
    {
      title: "ফোন",
      dataIndex: "phone",
      key: "phone",
      width: 150,
      // A phone number is an identifier — Latin digits, and tabular so a column of them
      // aligns (the ratified exception, same as the wallet's বিকাশ নম্বর column).
      className: "ex-num",
      render: (v: string | null) => v ?? "—",
    },
    { title: "নাম", dataIndex: "name", key: "name", render: (v: string | null) => v ?? "—" },
    {
      title: "স্ট্যাটাস",
      key: "status",
      width: 130,
      render: (_, m) => <SeatChip claimed={m.claimedAt != null} />,
    },
    {
      title: "সিট নেওয়ার সময়",
      dataIndex: "claimedAt",
      key: "claimedAt",
      width: 160,
      // Was `toLocaleDateString()` inside the tag — the reader's own locale AND timezone, so
      // an examiner abroad read a different day than the seat was claimed on. Dhaka-pinned.
      render: (v: string | null) =>
        v ? <span style={{ whiteSpace: "nowrap" }}>{formatDhakaShortBn(v)}</span> : "—",
    },
    {
      title: "উৎস",
      dataIndex: "source",
      key: "source",
      width: 120,
      render: (v: string) => <Typography.Text type="secondary">{sourceLabel(v)}</Typography.Text>,
    },
    {
      title: "",
      key: "action",
      align: "right",
      width: 90,
      // antd's danger link, the shape every other examiner table row-action uses — NOT a
      // `--ghost` pill: P1 records that ghost is the neutral-ink, non-destructive variant and
      // that this branch has no destructive ghost. Making the one destructive row action the
      // first would quietly re-open the decision T1 closed.
      render: (_, m) => (
        <Button type="link" size="small" danger onClick={() => setRevokeRow(m)}>
          সরান
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="রোস্টার"
        summary={summary}
        actions={
          <>
            <PillButton variant="ghost" onClick={() => navigate(-1)}>
              ফিরে যান
            </PillButton>
            <PillButton
              variant="primary"
              // No roster means no slot to add to — the POST would 404 on the same id the
              // GET just did.
              disabled={roster == null}
              onClick={() => setAddOpen(true)}
            >
              ফোন নম্বর যোগ করুন
            </PillButton>
          </>
        }
      />

      {/* The house three-state shape. The branch keys on `!roster`, never `isError`: TanStack
          keeps `data` through a same-key refetch failure, so the seats and members we already
          hold stay on screen under the strip instead of being thrown away for a panel that
          says we have nothing. */}
      {rosterQ.isPending ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : roster == null ? (
        notFound ? (
          <Card>
            <Space orientation="vertical" size="middle" style={{ alignItems: "flex-start" }}>
              <Typography.Text type="secondary">
                এই রোস্টারটি পাওয়া যায়নি — স্লটটি হয়তো আর নেই, বা এটি অন্য প্রতিষ্ঠানের।
              </Typography.Text>
              <PillButton variant="tonal" onClick={() => navigate(-1)}>
                ফিরে যান
              </PillButton>
            </Space>
          </Card>
        ) : (
          <RetryNotice
            tone="panel"
            busy={rosterQ.isFetching}
            onRetry={() => void rosterQ.refetch()}
          />
        )
      ) : (
        <>
          {/* `&& !notFound`: a refetch that 404s (the slot was deleted under the examiner, or
              the id went foreign) leaves the held roster on screen — correct — but the strip
              would then offer «আবার চেষ্টা করুন» against a permanent answer, the same dead
              retry loop the notFound panel above exists to avoid. A 404 here means the data
              below is final, not merely stale. */}
          {rosterQ.isError && !notFound && (
            <RetryNotice
              tone="strip"
              busy={rosterQ.isFetching}
              onRetry={() => void rosterQ.refetch()}
            />
          )}

          <div className="ex-stattiles ex-stattiles--3">
            <StatTile label="মোট সিট" value={bnNum(seatSlot)} />
            <StatTile label="ব্যবহৃত সিট" value={bnNum(seatsUsed)} />
            <StatTile label="খালি সিট" value={bnNum(seatsFree)} />
          </div>

          <Card title="আমন্ত্রণ কোড" style={{ marginTop: 12, marginBottom: 12 }}>
            {purchasesQ.isPending ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : purchase ? (
              <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                <Space wrap size="middle">
                  {/* The code itself is an identifier — Latin, ratified. */}
                  <Typography.Text code style={{ fontSize: 17, letterSpacing: ".08em" }}>
                    {purchase.inviteCode}
                  </Typography.Text>
                  <PillButton
                    variant="tonal"
                    size="sm"
                    onClick={() => void copyCode(purchase.inviteCode)}
                  >
                    কপি করুন
                  </PillButton>
                  {/* Outline, not ghost: P1 records that `--ghost` is the NEUTRAL-ink,
                      non-destructive variant, and rotating retires a code the examiner may
                      already have printed on a handout. */}
                  <PillButton variant="outline" size="sm" onClick={() => setRotateOpen(true)}>
                    কোড বদলান
                  </PillButton>
                  {/* The one blocking fact this page can report, in T1's danger vocabulary:
                      a full slot means the code no longer admits anyone — a student who
                      redeems it gets «সব সিট পূর্ণ» from the server. */}
                  {seatsFull && (
                    <span className="ex-chipstat ex-chipstat--danger">সব সিট পূর্ণ</span>
                  )}
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
                  শিক্ষার্থীরা এই কোড দিয়ে নিজেরাই একটি সিট নিতে পারে। তালিকাভুক্ত নম্বরগুলো
                  সাইন-ইন করলেই নিজে থেকে সিট পেয়ে যায়।
                </Typography.Text>
              </Space>
            ) : purchasesQ.data == null ? (
              // The list itself failed. Only the CODE is unavailable — the roster below it
              // came from its own query and stays on screen, so this is a body-sized panel
              // inside the card (framed={false}: it IS the card body), not a page panel.
              <RetryNotice
                tone="panel"
                framed={false}
                busy={purchasesQ.isFetching}
                onRetry={() => void purchasesQ.refetch()}
              />
            ) : (
              // The list answered and this slot is not in it. Nothing to retry — a retry pill
              // here would promise a recovery the same successful response has already ruled
              // out. Both queries are org-scoped to the same examiner, so this should be
              // unreachable; it is stated plainly rather than silently rendering an empty card.
              <Typography.Text type="secondary">
                আমন্ত্রণ কোডটি পাওয়া যায়নি — পেজটি আবার লোড করুন।
              </Typography.Text>
            )}
          </Card>

          {report && (
            <Alert
              type="warning"
              showIcon
              closable
              onClose={() => setReport(null)}
              style={{ marginBottom: 12 }}
              // One number, one meaning. «বাদ পড়েছে» is `errors.length` — the rows the server
              // REJECTED, which is exactly what the list below enumerates. `skipped` is a
              // different fact (the phone was already on this roster: ux_roster_slot_phone
              // deduped it), so it gets its own clause and only when it is non-zero. The two
              // were glossed as one word, which read as «N rejected» over an empty list.
              title={
                report.skipped > 0
                  ? `${bnNum(report.added)}টি যোগ হয়েছে · ${bnNum(report.errors.length)}টি বাদ পড়েছে · ${bnNum(report.skipped)}টি আগে থেকেই ছিল`
                  : `${bnNum(report.added)}টি যোগ হয়েছে · ${bnNum(report.errors.length)}টি বাদ পড়েছে`
              }
              description={
                // Server-written, and already Bengali on this endpoint
                // (SlotService.AddAllowlistAsync).
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {report.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              }
            />
          )}

          <Card title={`সদস্য · ${bnNum(roster.members.length)}জন`}>
            <Table<RosterMember>
              size="small"
              rowKey="id"
              columns={columns}
              dataSource={roster.members}
              pagination={false}
              locale={{
                emptyText:
                  "এখনো কোনো সদস্য নেই — উপরে ফোন নম্বর যোগ করুন বা আমন্ত্রণ কোডটি শেয়ার করুন।",
              }}
              scroll={{ x: true }}
            />
          </Card>
        </>
      )}

      <Modal
        title="ফোন নম্বর যোগ করুন"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => void submitAdd()}
        okText="যোগ করুন"
        cancelText="বাতিল"
        confirmLoading={addAllowlist.isPending}
      >
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            প্রতি লাইনে একটি ফোন নম্বর, কমার পরে নাম দিতে পারেন (ঐচ্ছিক)। এই নম্বরগুলো আমন্ত্রণ
            কোড দিয়ে সিট নিতে পারবে।
          </Typography.Text>
          {/* The two halves of the sample follow the two rules this page already applies to
              the column they feed: the number is an identifier and stays on Latin digits (it
              is what the examiner types on a Latin keypad), the name is prose and is Bengali. */}
          <Input.TextArea
            rows={5}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"01712345678, রহিম উদ্দিন\n01898765432"}
          />
        </Space>
      </Modal>

      <Modal
        title="আমন্ত্রণ কোড বদলাবেন?"
        open={rotateOpen}
        onCancel={() => setRotateOpen(false)}
        onOk={submitRotate}
        okText="বদলান"
        cancelText="না"
        confirmLoading={rotate.isPending}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          বর্তমান কোড সঙ্গে সঙ্গে কাজ করা বন্ধ করবে। যারা ইতিমধ্যে সিট নিয়েছে তাদের অ্যাক্সেস
          থাকবে।
        </Typography.Paragraph>
      </Modal>

      <Modal
        title="রোস্টার থেকে সরাবেন?"
        open={revokeRow !== null}
        onCancel={() => setRevokeRow(null)}
        onOk={submitRevoke}
        okText="সরান"
        cancelText="না"
        okButtonProps={{ danger: true }}
        confirmLoading={revoke.isPending}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {revokeRow?.name ?? revokeRow?.phone
            ? `«${revokeRow?.name ?? revokeRow?.phone}» `
            : "এই সদস্য "}
          আর অ্যাক্সেস পাবেন না। তিনি এখনো কোনো পরীক্ষা শুরু না করে থাকলে সিটটি খালি হয়ে
          যাবে; শুরু করে থাকলে সিটটি খরচ হয়ে গেছে এবং সরানো যাবে না।
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
