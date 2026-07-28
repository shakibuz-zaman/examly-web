import { useState } from "react";
import { Alert } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStudentExam } from "../api/student";
import { CheckoutSheet } from "../components/CheckoutSheet";
import { Illustration } from "../components/Illustration";
import { ExamStepRow, type StepState } from "../features/student/ExamStepRow";
import { BuyCta, ProductBand } from "../features/student/ProductBand";
import { bnNum } from "../lib/bn";
import { formatDhakaShortBn, formatDurationBn } from "../lib/format";
import { ATTEMPT_STATUS } from "../lib/labels";
import { EmptyState } from "../ui/EmptyState";
import { PageContainer } from "../ui/PageContainer";
import { PillButton } from "../ui/PillButton";
import { SectionHeader } from "../ui/SectionHeader";
import { SkeletonCard } from "../ui/Skeletons";
import type { MyAttemptSummary, StudentExam } from "../api/types";

// D12: one row per fact, label left / value right — not condensed into chips. Negative
// marking especially: it is the fact that costs marks.
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="ex-facts-row">
      <span className="ex-facts-label">{label}</span>
      <span className="ex-facts-value">{value}</span>
    </div>
  );
}

function stateOf(attempt: MyAttemptSummary): StepState {
  // in_progress first: `revealed` is computed from the exam's reveal gate, not from the
  // attempt being finished, so a running attempt on an ungated exam already reports true.
  // A lobby row is never "todo" — an attempt exists or there is no row.
  if (attempt.status === "in_progress") return "running";
  return attempt.revealed ? "done" : "pending";
}

function metaOf(attempt: MyAttemptSummary, state: StepState, revealAtUtc: string | null) {
  const facts = `${ATTEMPT_STATUS[attempt.status]} · শুরু ${formatDhakaShortBn(attempt.startedAt)}`;
  // Both halves: they are set together by the same reveal gate, so a lone null would
  // print «42/null» rather than dropping the pair.
  if (state === "done" && attempt.score != null && attempt.maxScore != null)
    return (
      <>
        {facts}
        {" · স্কোর "}
        <span className="tnum">{`${attempt.score}/${attempt.maxScore}`}</span>
      </>
    );
  // D11: the deadline is formatted once, not ticked — the live countdown is the runner's.
  if (state === "running") return `${facts} · শেষ সময় ${formatDhakaShortBn(attempt.deadlineUtc)}`;
  if (state === "done") return facts;
  return revealAtUtc
    ? `${facts} · ফলাফল ${formatDhakaShortBn(revealAtUtc)}-এ`
    : `${facts} · ফলাফল অপেক্ষমাণ`;
}

function windowOf(exam: StudentExam): string {
  if (!exam.windowStartUtc) return "যেকোনো সময়";
  const end = exam.windowEndUtc ? formatDhakaShortBn(exam.windowEndUtc) : "—";
  return `${formatDhakaShortBn(exam.windowStartUtc)} → ${end}`;
}

export function StudentExamLobbyPage() {
  const { id } = useParams();
  // isPending, NOT isLoading — see StudentModelTestPage for the full reasoning: a paused
  // query reports isLoading false, and «পাওয়া যাচ্ছে না» would stand in for a fetch that
  // never ran. The `:id` route param always exists, so the enable gate never holds it.
  const { data: exam, isPending, isError } = useStudentExam(id);
  const navigate = useNavigate();
  const [buyOpen, setBuyOpen] = useState(false);

  if (isPending) {
    return (
      <PageContainer>
        <SkeletonCard />
      </PageContainer>
    );
  }
  if (isError || !exam) {
    return (
      <PageContainer>
        <EmptyState
          variant="empty"
          message="এই পরীক্ষাটি পাওয়া যাচ্ছে না।"
          actionLabel="মডেল টেস্ট দেখুন"
          actionTo="/student/tests"
        />
      </PageContainer>
    );
  }

  const listing = exam.listing;
  const resumable = exam.myAttempts.some((a) => a.status === "in_progress");
  // D11 + the lint baseline: the page's only impure line was
  //   new Date(exam.windowStartUtc).getTime() > Date.now()
  // Server truth replaces it — canStart is false and cannotStartReason is set precisely
  // when the window has not opened, so the clock read has nothing left to decide. The flag
  // is a deliberate superset: a windowed exam blocked for another reason (unbought, no
  // attempts left) also trips it, and all it gates is the decorative art.
  const notOpenedYet = !exam.canStart && exam.windowStartUtc != null && exam.cannotStartReason != null;
  // The parent bundle is this exam's real parent when it has one, so it takes the back
  // slot the «Part of …» paragraph used to hold; otherwise the store.
  const back =
    exam.modelTestId && exam.modelTestTitle
      ? { to: `/student/model-tests/${exam.modelTestId}`, label: exam.modelTestTitle }
      : { to: "/student/tests", label: "মডেল টেস্ট" };

  return (
    <>
      <ProductBand
        title={exam.title}
        back={back}
        org={exam.orgName}
        count={`${bnNum(exam.questionCount)}টি প্রশ্ন`}
        listing={listing}
      />
      <PageContainer banded>
        {exam.description && (
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ex-ink-soft)" }}>
            {exam.description}
          </p>
        )}

        {notOpenedYet && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Illustration name="lobby" />
          </div>
        )}

        {/* .ex-facts draws its own row rules and drops the last one, so the card supplies
            only the gutters (.ex-card ships no padding of its own by design). */}
        <div className="ex-card ex-facts" style={{ marginTop: 12, padding: "4px 16px" }}>
          <Fact label="প্রশ্ন" value={bnNum(exam.questionCount)} />
          <Fact label="মোট নম্বর" value={bnNum(exam.totalMarks)} />
          <Fact label="সময়" value={formatDurationBn(exam.durationMinutes)} />
          <Fact
            label="নেগেটিভ মার্কিং"
            value={exam.negativeMarks > 0 ? `প্রতি ভুলে −${bnNum(exam.negativeMarks)}` : "নেই"}
          />
          <Fact label="সময়সীমা" value={windowOf(exam)} />
          <Fact label="রিটেক" value={exam.allowRetakes ? "একাধিকবার (প্রথমটি র‍্যাঙ্ক হয়)" : "একবারই"} />
        </div>

        <div style={{ marginTop: 16 }}>
          {listing.canBuy ? (
            <BuyCta priceBdt={listing.priceBdt} onClick={() => setBuyOpen(true)} />
          ) : (
            <PillButton
              variant="primary"
              disabled={!exam.canStart}
              onClick={() => navigate(`/student/exams/${exam.id}/take`)}
            >
              {resumable ? "চালিয়ে যান" : "পরীক্ষা শুরু করুন"}
            </PillButton>
          )}
          {/* Rendered as-is: the reason is Bengali at the source. No «শুরু {date}» line
              under it — the facts card above already carries সময়সীমা, and the reason is
              also set for blocks that have nothing to do with the window. */}
          {!listing.canBuy && !exam.canStart && exam.cannotStartReason && (
            <Alert style={{ marginTop: 8 }} type="info" showIcon title={exam.cannotStartReason} />
          )}
        </div>

        <CheckoutSheet
          open={buyOpen}
          onClose={() => setBuyOpen(false)}
          listingId={listing.listingId}
          title={exam.title}
          priceBdt={listing.priceBdt}
          onPurchased={() => {
            // Ownership invalidations run inside useStubPay, so the lobby refetches on its own
            // (canStart flips true). The sheet shows its success screen then auto-closes itself.
          }}
        />

        {exam.myAttempts.length > 0 && (
          <>
            <SectionHeader label="আমার অ্যাটেম্পট" trailing={`${bnNum(exam.myAttempts.length)}টি`} />
            <div className="ex-card" style={{ padding: "0 16px" }}>
              {exam.myAttempts.map((attempt) => {
                const state = stateOf(attempt);
                return (
                  <ExamStepRow
                    key={attempt.id}
                    state={state}
                    title={`অ্যাটেম্পট ${bnNum(attempt.attemptNumber)}`}
                    meta={metaOf(attempt, state, exam.revealAtUtc)}
                    // রিভিউ is the only per-row destination: the running row's চালিয়ে যান is
                    // the page's own primary CTA above, for this same attempt. Gated on the
                    // state rather than the score pair — a revealed attempt always has a
                    // result page, and it is the way to see a score the row could not print.
                    action={
                      state === "done" ? (
                        <Link
                          className="ex-btn ex-btn--outline ex-btn--sm"
                          to={`/student/attempts/${attempt.id}/result`}
                        >
                          রিভিউ
                        </Link>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}
