import { Card, Skeleton, Typography } from "antd";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useExamAnalytics } from "../../../api/examinerAnalytics";
import { bnNum } from "../../../lib/bn";
import { EmptyState } from "../../../ui/EmptyState";
import { RetryNotice } from "../../../ui/RetryNotice";
import { StatTile } from "../../../ui/StatTile";
import { useChartColors } from "../chartTheme";
import { TopicTreeTable } from "./TopicTreeTable";
import { HardestQuestionsTable } from "./HardestQuestionsTable";

// The server files every ranked percentage into 10 buckets of 10 points, clamped to [0, 9]
// (ExaminerAnalyticsService.cs:259) — so the LAST bucket is 90–100, not 90–99, and a perfect
// score lives there. Printing «৯০–৯৯%» over a bar that contains the 100s would be wrong.
const bucketRange = (lo: number) => `${bnNum(lo)}–${bnNum(lo === 90 ? 100 : lo + 9)}%`;

// Lazy-loaded from ExamResultsPage — this module (and its two tables) is the only path by
// which recharts enters examiner code, so it must stay out of the main chunk.
export function ExamAnalyticsTab({ examId }: { examId: string }) {
  const chartColors = useChartColors();
  const analytics = useExamAnalytics(examId, true);
  const data = analytics.data;

  // Three states, not two. The head was `isError || !data` → one English `Empty` for both
  // "it failed" and "there is nothing", with no way back. Now: pending gets the skeleton,
  // dataless-and-settled gets the retry panel, and a failure that still holds the previous
  // answer keeps it on screen under the strip (`!data`, never `isError` — see RetryNotice).
  if (analytics.isPending) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (!data)
    return (
      <RetryNotice
        tone="panel"
        busy={analytics.isFetching}
        onRetry={() => void analytics.refetch()}
      />
    );

  // `useExamAnalytics` carries no placeholderData, so `data` always describes THIS exam and
  // the empty claim below can never be a statement about a previous one (the gate the
  // filtered surfaces need). The strip still has to ride above it: a stale-but-held zero
  // funnel is still a real answer worth showing, with the caveat attached.
  const strip = analytics.isError && (
    <RetryNotice tone="strip" busy={analytics.isFetching} onRetry={() => void analytics.refetch()} />
  );

  const { funnel, histogram } = data;
  if (funnel.started === 0)
    return (
      <>
        {strip}
        <EmptyState variant="empty" message="এই পরীক্ষায় এখনো কেউ অংশ নেয়নি — অ্যাটেম্পট শুরু হলে এখানে বিশ্লেষণ আসবে।" />
      </>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {strip}
      <div>
        <div className="ex-stattiles">
          <StatTile label="শুরু করেছে" value={bnNum(funnel.started)} />
          <StatTile label="জমা দিয়েছে" value={bnNum(funnel.submitted)} />
          <StatTile label="সময় শেষ" value={bnNum(funnel.expired)} />
          <StatTile label="চলমান" value={bnNum(funnel.inProgress)} />
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          শুধু র‍্যাঙ্কড প্রথম অ্যাটেম্পট — প্র্যাকটিস রিটেক এই হিসাবে নেই।
        </Typography.Text>
      </div>

      <Card title="স্কোর বিতরণ">
        <div
          role="img"
          aria-label="স্কোর বিতরণের বার চার্ট — সর্বোচ্চ নম্বরের প্রতি ১০ শতাংশ ভাগে কতজন শিক্ষার্থী"
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histogram.buckets.map((count, i) => ({ bucket: `${i * 10}`, count }))}>
              {/* RULING (7f review): chart axis tick numbers are Bengali app-wide, as in
                  PositionCard and OrgDashboard. D8's Western digits stay scoped to TABLE
                  data — the score/percent columns in the two tables below. */}
              <XAxis dataKey="bucket" tickFormatter={(v) => bnNum(v)}
                tick={{ fontSize: 10, fill: chartColors.axis }} />
              <YAxis allowDecimals={false} tickFormatter={(v) => bnNum(v)}
                tick={{ fontSize: 10, fill: chartColors.axis }} width={28} />
              {/* `separator=""` with an empty name: recharts prints `name + separator + value`,
                  so the default " : " left a stray «: ৭ জন» hanging under the label. There is
                  one series here — the label already says which bucket, the row is the count. */}
              <Tooltip
                separator=""
                formatter={(v) => [`${bnNum(Number(v))} জন`, ""]}
                labelFormatter={(l) => `সর্বোচ্চ নম্বরের ${bucketRange(Number(l))}`}
              />
              {/* One fill for every bar — no <Cell> map. Unlike PositionCard's histogram there
                  is no "yours" bar to single out here, and mapping identical Cells only made
                  the emphasis look like it was about to mean something. */}
              <Bar dataKey="count" fill={chartColors.you} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          মিডিয়ান {histogram.medianPercent === null ? "—" : bnNum(histogram.medianPercent)}% ·
          সর্বোচ্চ {histogram.topPercent === null ? "—" : bnNum(histogram.topPercent)}%।
          নেগেটিভ মার্কিংয়ে মোট নম্বর ঋণাত্মক হলে সেই অ্যাটেম্পট প্রথম ভাগে ({bucketRange(0)}) ধরা হয়।
        </Typography.Text>
      </Card>

      <TopicTreeTable rows={data.topics} />
      <HardestQuestionsTable rows={data.hardestQuestions} />
    </div>
  );
}
