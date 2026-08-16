import { Drawer, Skeleton, Typography } from "antd";
import { useAttemptBreakdown } from "../../../api/examinerAnalytics";
import type { ExamResultRow } from "../../../api/types";
import { EmptyState } from "../../../ui/EmptyState";
import { RetryNotice } from "../../../ui/RetryNotice";
import { StrengthBarRow } from "../StrengthMap";

// Per-student drill (spec §8): same StrengthBarRow the student page uses — which means the
// bars, the «আরও প্রশ্ন দরকার» tag and the «সহপাঠী» readout were already Bengali while the
// chrome around them was not. 7f finishes the job: title, meta and every state message.
// The peer tick here is cohort accuracy over this exam's ranked first attempts.
export function AttemptBreakdownDrawer({
  examId, row, onClose,
}: { examId: string; row: ExamResultRow | null; onClose: () => void }) {
  const breakdown = useAttemptBreakdown(examId, row?.attemptId ?? null);
  const rows = breakdown.data ?? [];

  return (
    <Drawer
      open={row !== null}
      onClose={onClose}
      size={480}
      // «প্র্যাকটিস» rides on the attempt ordinal, which is the only signal the row carries.
      // (A post-window FIRST start is unranked too but arrives as #1, so it reads as a plain
      // attempt here — the practice TAB is what files it correctly.)
      title={row ? `${row.studentName}${row.attemptNumber > 1 ? " · প্র্যাকটিস" : ""}` : ""}
    >
      {row && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {/* Score and rank are tallies/identifiers — Western digits (D8 and the ratified
              «অ্যাটেম্পট #2» exception), wrapped in .ex-num so they align like the table's. */}
          {row.score !== null ? (
            <>স্কোর <span className="ex-num">{row.score} / {row.maxScore}</span></>
          ) : (
            "এখনো ফাইনালাইজ হয়নি"
          )}
          {row.rank !== null && <> · র‍্যাঙ্ক #<span className="ex-num">{row.rank}</span></>}
          {row.attemptNumber > 1 && (
            <> · অ্যাটেম্পট #<span className="ex-num">{row.attemptNumber}</span></>
          )}
        </Typography.Paragraph>
      )}
      {breakdown.isPending ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : !breakdown.data ? (
        // Failure gets a way out, not a dead end. `!data` rather than `isError` for the house
        // reason (RetryNotice): a same-key refetch failure keeps the bars we already hold.
        <RetryNotice
          tone="panel"
          busy={breakdown.isFetching}
          onRetry={() => void breakdown.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState variant="empty" message="এই অ্যাটেম্পটে এখনো কোনো উত্তর জমা পড়েনি।" />
      ) : (
        <>
          {breakdown.isError && (
            <RetryNotice
              tone="strip"
              busy={breakdown.isFetching}
              onRetry={() => void breakdown.refetch()}
            />
          )}
          {rows.map((subject) => (
            <div key={subject.nodeId ?? "uncategorized"}>
              <StrengthBarRow row={subject} />
              {subject.subtopics.map((topic) => (
                <div key={topic.nodeId ?? "uncat-topic"}>
                  <StrengthBarRow row={topic} indent={1} />
                  {topic.subtopics.map((sub) => (
                    <StrengthBarRow key={sub.nodeId ?? "uncat-sub"} row={sub} indent={2} />
                  ))}
                </div>
              ))}
            </div>
          ))}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ▐ দাগ = একই প্রশ্নে সহপাঠীদের গড় (র‍্যাঙ্কড প্রথম অ্যাটেম্পট)।
          </Typography.Text>
        </>
      )}
    </Drawer>
  );
}
