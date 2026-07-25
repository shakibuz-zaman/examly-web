import { useMemo, useState } from "react";
import { Alert, Button, Input, message } from "antd";
import { CheckCircle2, Clock, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClaimSeat, useInfiniteMyExams } from "../../api/commerce";
import { bnNum } from "../../lib/bn";
import { formatDhakaShortBn } from "../../lib/format";
import { EmptyState } from "../../ui/EmptyState";
import { PillButton } from "../../ui/PillButton";
import { RowItem } from "../../ui/RowItem";
import { SectionHeader } from "../../ui/SectionHeader";
import { SkeletonRow } from "../../ui/Skeletons";
import type { MyExamItem } from "../../api/types";

type Group = "running" | "upcoming" | "results";

// Recorded deviation 3: never-attempted lands in চলমান, not a fourth "not started"
// group — an owned exam whose window is open is actionable now either way.
function groupOf(item: MyExamItem, now: number): Group {
  // `expired` is finalised and scored just like `submitted` (overdue finalisation writes the
  // score), so a timed-out attempt belongs in ফলাফল — not in চলমান behind a Play icon.
  if (
    item.productType === "exam" &&
    (item.latestAttemptStatus === "submitted" || item.latestAttemptStatus === "expired")
  )
    return "results";
  if (item.windowStartUtc && Date.parse(item.windowStartUtc) > now) return "upcoming";
  return "running";
}

const GROUP_META: { key: Group; label: string }[] = [
  { key: "running", label: "চলমান" },
  { key: "upcoming", label: "আসছে" },
  { key: "results", label: "ফলাফল" },
];

// Tinted lead circle. RowItem's own wrapper carries `.ex-rowitem-lead` but no colour,
// so the tint pair rides on an inner span of the same class — same 34px box, so it
// paints as one circle. Inline style only because the pair is group-dynamic.
function lead(group: Group) {
  const common = { size: 17, strokeWidth: 1.75, "aria-hidden": true } as const;
  if (group === "results")
    return (
      <span
        className="ex-rowitem-lead"
        style={{ background: "var(--ex-green-tint)", color: "var(--ex-green)" }}
      >
        <CheckCircle2 {...common} />
      </span>
    );
  if (group === "upcoming")
    return (
      <span
        className="ex-rowitem-lead"
        style={{ background: "var(--ex-amber-tint)", color: "var(--ex-amber)" }}
      >
        <Clock {...common} />
      </span>
    );
  return (
    <span
      className="ex-rowitem-lead"
      style={{ background: "var(--ex-teal-tint)", color: "var(--ex-teal-ink)" }}
    >
      <Play {...common} />
    </span>
  );
}

// Dot-joined meta line. Scores keep Western digits + .tnum (spec §1.2); prose
// datetimes are Dhaka-pinned Bengali, matching TestCard's «শুরু …».
function metaFor(item: MyExamItem, group: Group) {
  const source = item.source === "purchase" ? "কেনা" : item.source === "seat" ? "সিট" : "ফ্রি";
  const parts: string[] = [];
  if (item.orgName) parts.push(item.orgName);
  parts.push(source);
  if (item.productType === "model_test" && item.examCount > 0)
    parts.push(`${bnNum(item.examCount)}টি পরীক্ষা`);
  if (group === "upcoming" && item.windowStartUtc)
    parts.push(`শুরু ${formatDhakaShortBn(item.windowStartUtc)}`);
  if (group === "results") {
    // Gate on `revealed`, not `score != null`: a bundle row and a withheld result both
    // carry a null score for different reasons, and only the latter has a reveal time.
    if (item.revealed && item.score !== null && item.maxScore !== null) {
      return (
        <>
          {parts.join(" · ")} · স্কোর{" "}
          <span className="tnum">{`${item.score}/${item.maxScore}`}</span>
        </>
      );
    }
    parts.push(
      item.revealAtUtc ? `ফলাফল ${formatDhakaShortBn(item.revealAtUtc)}` : "ফলাফল অপেক্ষমাণ",
    );
  }
  return parts.join(" · ");
}

// Bundles carry per-member state, so they just deep-link ("দেখুন"); single exams
// surface the runtime action for the student's own latest attempt.
function ctaFor(item: MyExamItem): { label: string; to: string } {
  if (item.productType === "model_test") {
    return { label: "দেখুন", to: `/student/model-tests/${item.productId}` };
  }
  const status = item.latestAttemptStatus;
  const label = status == null ? "শুরু করুন" : status === "in_progress" ? "চালিয়ে যান" : "রিভিউ";
  return { label, to: `/student/exams/${item.productId}` };
}

// B2B seat claim by invite code. The hook invalidates the ownership seam on success,
// so a claimed exam appears in the list below immediately.
function ClaimSeatForm() {
  const [code, setCode] = useState("");
  const claim = useClaimSeat();
  const submit = () => {
    const trimmed = code.trim();
    if (!trimmed || claim.isPending) return;
    claim.mutate(trimmed, {
      onSuccess: () => {
        message.success("পরীক্ষায় যোগ দেওয়া হয়েছে");
        setCode("");
      },
      onError: (e: unknown) => {
        const err = e as { response?: { data?: { error?: string } } };
        message.error(err.response?.data?.error ?? "কোড যাচাই করা যায়নি");
      },
    });
  };
  return (
    <Input.Search
      value={code}
      onChange={(e) => setCode(e.target.value)}
      onSearch={submit}
      placeholder="ইনভাইট কোড"
      enterButton="কোড দিয়ে যোগ দিন"
      loading={claim.isPending}
      style={{ maxWidth: 380 }}
    />
  );
}

export function MyExamsList() {
  const query = useInfiniteMyExams();
  const navigate = useNavigate();

  // One clock for the whole list. `Date.now()` in the render body is an impure
  // render-time read (react-hooks/purity), so it is seeded lazily into state. No
  // ticker here on purpose: unlike the store grid, nothing in this list changes
  // look on a timer except a row crossing its own window start — a boundary the
  // student reaches by opening the row, which refetches anyway. A `now` that is
  // stale for the session is acceptable; the row's own page shows the truth.
  const [now] = useState(() => Date.now());

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  const groups = useMemo(() => {
    const map: Record<Group, MyExamItem[]> = { running: [], upcoming: [], results: [] };
    for (const item of items) map[groupOf(item, now)].push(item);
    return map;
  }, [items, now]);

  if (query.isError) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <ClaimSeatForm />
        </div>
        <Alert
          type="error"
          showIcon
          title="আপনার পরীক্ষা লোড করা যায়নি"
          action={
            <Button size="small" onClick={() => void query.refetch()}>
              আবার চেষ্টা করুন
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <ClaimSeatForm />
      </div>
      {query.isLoading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : items.length === 0 ? (
        <EmptyState variant="empty" message="আপনি এখনো কোনো পরীক্ষা কেনেননি বা যোগ দেননি" />
      ) : (
        <>
          {GROUP_META.map(({ key, label }) =>
            groups[key].length === 0 ? null : (
              <div key={key}>
                <SectionHeader label={label} trailing={`${bnNum(groups[key].length)}টি`} />
                {groups[key].map((item) => {
                  const cta = ctaFor(item);
                  return (
                    <RowItem
                      key={item.listingId}
                      lead={lead(key)}
                      title={item.title}
                      meta={metaFor(item, key)}
                      trailing={
                        <PillButton
                          variant={key === "results" ? "outline" : "tonal"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // same destination as the row — avoid double-fire
                            navigate(cta.to);
                          }}
                        >
                          {key === "results" ? "রিভিউ" : cta.label}
                        </PillButton>
                      }
                      onClick={() => navigate(cta.to)}
                    />
                  );
                })}
              </div>
            ),
          )}
          {query.hasNextPage && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <PillButton
                variant="outline"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                আরো দেখুন
              </PillButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
