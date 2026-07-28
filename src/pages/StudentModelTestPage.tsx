import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStudentModelTest } from "../api/student";
import { CheckoutSheet } from "../components/CheckoutSheet";
import { ExamStepRow, type StepState } from "../features/student/ExamStepRow";
import { BuyCta, ProductBand } from "../features/student/ProductBand";
import { bnNum } from "../lib/bn";
import { formatDhakaShortBn, formatDurationBn } from "../lib/format";
import { ATTEMPT_STATUS } from "../lib/labels";
import { EmptyState } from "../ui/EmptyState";
import { PageContainer } from "../ui/PageContainer";
import { SkeletonCard } from "../ui/Skeletons";
import type { StudentBundleExam } from "../api/types";

function stateOf(exam: StudentBundleExam): StepState {
  if (exam.myStatus === "in_progress") return "running";
  if (exam.myStatus === "submitted" || exam.myStatus === "expired")
    return exam.myRevealed ? "done" : "pending";
  return "todo";
}

// Counts, marks and percentages in Bengali numerals; the score pair keeps Western digits
// with .tnum (the lib/bn.ts split). Every branch ends in words that name the state — the
// row's glyph is aria-hidden, so this line is the only status an assistive tech reads, and
// `status` stands in wherever the state's own detail (a score, a reveal time, a deadline)
// is missing.
function metaOf(exam: StudentBundleExam, state: StepState) {
  const facts = `${bnNum(exam.questionCount)}টি প্রশ্ন · ${formatDurationBn(exam.durationMinutes)} · ${bnNum(exam.totalMarks)} নম্বর`;
  const status = ATTEMPT_STATUS[exam.myStatus];
  if (state === "done")
    return (
      <>
        {facts}
        {/* Both halves, not just the score: they are set together by the same reveal gate,
            so a lone null would print «42/null» rather than dropping the pair. */}
        {exam.myScore != null && exam.myMaxScore != null ? (
          <>
            {" · স্কোর "}
            <span className="tnum">{`${exam.myScore}/${exam.myMaxScore}`}</span>
          </>
        ) : (
          ` · ${status}`
        )}
        {/* != null, never truthiness: percentile 0 is the top of the cohort, and a bare
            `exam.myPercentile &&` would drop the line for the one student it flatters most. */}
        {exam.myPercentile != null && ` · টপ ${bnNum(100 - exam.myPercentile)}%`}
      </>
    );
  if (state === "pending")
    return exam.revealAtUtc
      ? `${facts} · ফলাফল ${formatDhakaShortBn(exam.revealAtUtc)}-এ`
      : // The reveal time is null when it hangs off a window this exam does not have —
        // «ফলাফল -এ» would be worse than naming the wait (the আমার পরীক্ষা list's fallback).
        `${facts} · ফলাফল অপেক্ষমাণ`;
  // D11: a formatted deadline, never a ticking clock. The server-anchored countdown lives
  // in the runner, one tap away behind চালিয়ে যান.
  if (state === "running")
    return exam.myDeadlineUtc
      ? `${facts} · শেষ সময় ${formatDhakaShortBn(exam.myDeadlineUtc)}`
      : `${facts} · ${status}`;
  return `${facts} · ${status}`;
}

// Real <a>s, not navigate() buttons: every one of these is a destination, so middle-click,
// copy-link and the back stack all work (the EmptyState cross-link rule).
function actionOf(exam: StudentBundleExam, state: StepState) {
  if (state === "done")
    return exam.myAttemptId ? (
      <Link
        className="ex-btn ex-btn--outline ex-btn--sm"
        to={`/student/attempts/${exam.myAttemptId}/result`}
      >
        রিভিউ
      </Link>
    ) : undefined;
  if (state === "running")
    return (
      <Link className="ex-btn ex-btn--primary ex-btn--sm" to={`/student/exams/${exam.id}/take`}>
        চালিয়ে যান
      </Link>
    );
  if (state === "todo")
    return (
      <Link className="ex-btn ex-btn--tonal ex-btn--sm" to={`/student/exams/${exam.id}`}>
        শুরু করুন
      </Link>
    );
  // A pre-reveal row has nothing to do yet; the meta line carries the reveal time.
  return undefined;
}

export function StudentModelTestPage() {
  const { id } = useParams();
  // isPending, NOT isLoading (= `isPending && isFetching`): a query with no data that is
  // not fetching at this instant — an offline fetch is PAUSED, not failed — reports
  // isLoading false and would fall straight through to «পাওয়া যাচ্ছে না», which claims the
  // bundle is gone when nothing was ever asked. The `:id` route param always exists, so
  // the hook's enable gate never holds the query pending on its own.
  const { data: bundle, isPending, isError } = useStudentModelTest(id);
  const [buyOpen, setBuyOpen] = useState(false);

  if (isPending) {
    return (
      <PageContainer>
        <SkeletonCard />
      </PageContainer>
    );
  }
  if (isError || !bundle) {
    return (
      <PageContainer>
        <EmptyState
          variant="empty"
          message="এই মডেল টেস্টটি পাওয়া যাচ্ছে না।"
          actionLabel="মডেল টেস্ট দেখুন"
          actionTo="/student/tests"
        />
      </PageContainer>
    );
  }

  const listing = bundle.listing;

  return (
    <>
      <ProductBand
        title={bundle.title}
        back={{ to: "/student/tests", label: "মডেল টেস্ট" }}
        org={bundle.orgName}
        count={`${bnNum(bundle.exams.length)}টি পরীক্ষা`}
        listing={listing}
      />
      <PageContainer banded>
        {bundle.description && (
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ex-ink-soft)" }}>
            {bundle.description}
          </p>
        )}

        {listing.canBuy && (
          <div style={{ marginTop: 12 }}>
            <BuyCta priceBdt={listing.priceBdt} onClick={() => setBuyOpen(true)} />
          </div>
        )}

        <CheckoutSheet
          open={buyOpen}
          onClose={() => setBuyOpen(false)}
          listingId={listing.listingId}
          title={bundle.title}
          priceBdt={listing.priceBdt}
          onPurchased={() => {
            // Ownership invalidations run inside useStubPay; the bundle page refetches on its own.
            // The sheet shows its success screen then auto-closes itself.
          }}
        />

        {bundle.exams.length > 0 && (
          // The rows draw their own dividers and drop the last one, so the card supplies
          // only the gutters (.ex-card ships no padding of its own by design).
          <div className="ex-card" style={{ marginTop: 12, padding: "0 16px" }}>
            {bundle.exams.map((exam) => {
              const state = stateOf(exam);
              return (
                <ExamStepRow
                  key={exam.id}
                  state={state}
                  title={exam.title}
                  meta={metaOf(exam, state)}
                  action={actionOf(exam, state)}
                />
              );
            })}
          </div>
        )}
      </PageContainer>
    </>
  );
}
