import { Drawer, Empty, Skeleton, Typography } from "antd";
import { useAttemptBreakdown } from "../../../api/examinerAnalytics";
import type { ExamResultRow } from "../../../api/types";
import { StrengthBarRow } from "../StrengthMap";

// Per-student drill (spec §8): same StrengthBarRow the student page uses; the
// peer tick here is cohort accuracy over this exam's ranked first attempts.
export function AttemptBreakdownDrawer({
  examId, row, onClose,
}: { examId: string; row: ExamResultRow | null; onClose: () => void }) {
  const breakdown = useAttemptBreakdown(examId, row?.attemptId ?? null);
  const rows = breakdown.data ?? [];

  return (
    <Drawer
      open={row !== null}
      onClose={onClose}
      width={480}
      title={row ? `${row.studentName}${row.attemptNumber > 1 ? " · practice" : ""}` : ""}
    >
      {row && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {row.score !== null ? `Score ${row.score} / ${row.maxScore}` : "Not finalized yet"}
          {row.rank !== null && ` · rank #${row.rank}`}
        </Typography.Paragraph>
      )}
      {breakdown.isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : breakdown.isError ? (
        <Empty description="Could not load the breakdown." />
      ) : rows.length === 0 ? (
        <Empty description="No answers recorded yet." />
      ) : (
        <>
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
            ▐ tick = cohort accuracy (ranked first attempts) on the same questions.
          </Typography.Text>
        </>
      )}
    </Drawer>
  );
}
