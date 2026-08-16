import { Card, Skeleton, Typography } from "antd";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { usePosition } from "../../api/analytics";
import { bnNum } from "../../lib/bn";
import { RetryNotice } from "../../ui/RetryNotice";
import type { AnalyticsFilters } from "./filters";
import { useChartColors } from "./chartTheme";

export function PositionCard({ filters }: { filters: AnalyticsFilters }) {
  const chartColors = useChartColors();
  // D8: one mode control per page. The card used to own a second Segmented with identical
  // vocabulary, so the page and the card could disagree on screen. P2: this also changes
  // the card's default from "live" to the page default "all" — accepted; the caption still
  // explains that live is the everyone-at-once cohort.
  const position = usePosition(filters.categoryId, filters.mode);
  const p = position.data;

  // The house strip rule (see RetryNotice): a failure that still HOLDS the previous answer
  // keeps it on screen and says so, instead of throwing it away. Every branch below therefore
  // keys on `!p`, never on `isError` — TanStack keeps `data` through a same-key refetch
  // failure, and this card refetches on every ক্যাটাগরি/মোড change the progress page makes.
  const strip = position.isError && (
    <RetryNotice
      tone="strip"
      busy={position.isFetching}
      onRetry={() => void position.refetch()}
    />
  );

  return (
    <Card title="আপনার অবস্থান">
      {/* Three states, not two. The old head was `position.isLoading || !p`, so once the
          retries were exhausted `isLoading` went false while `p` stayed undefined forever and
          the card sat on a live-looking skeleton with no error and no way out. isPending is
          the real pending state (placeholderData now keeps the previous slice on screen), and
          failure gets its own branch — the empty-state text below is a claim about the cohort
          and must never stand in for a failed request.
          `!p` rides WITH the failure branch, not with the skeleton, because "settled and
          still dataless" IS the hang: a skeleton there promises an arrival that is not coming.
          Every no-data path therefore ends somewhere the student can read, whether or not the
          query bothered to call itself an error — and now with a way out: the sentence used to
          be dead text with no retry. `framed={false}` because this card already IS the frame;
          a tone="panel" Card here would draw a second box inside the first. */}
      {position.isPending ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : !p ? (
        <RetryNotice
          tone="panel"
          framed={false}
          busy={position.isFetching}
          onRetry={() => void position.refetch()}
        />
      ) : p.participants === 0 || p.yourAvgPercentile === null ? (
        <>
          {strip}
          <Typography.Text type="secondary">
            এখনো কোনো র‍্যাঙ্কড অ্যাটেম্পট নেই।
          </Typography.Text>
        </>
      ) : (
        <>
          {strip}
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {bnNum(p.participants)} জনের মধ্যে টপ {bnNum(100 - p.yourAvgPercentile)}%
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            {bnNum(p.examCount)}টি পরীক্ষার গড়
          </Typography.Paragraph>
          <div
            role="img"
            aria-label="পার্সেন্টাইল বিতরণ — প্রতি ধাপে কতজন শিক্ষার্থী"
            aria-busy={position.isPlaceholderData}
            style={{
              filter: position.isPlaceholderData ? "saturate(0.35)" : undefined,
              transition: "filter .2s",
            }}
          >
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={p.buckets.map((count, i) => ({ bucket: `${i * 10}`, count }))}>
                <XAxis dataKey="bucket" tickFormatter={(v) => bnNum(v)}
                  tick={{ fontSize: 10, fill: chartColors.axis }} />
                <Tooltip
                  formatter={(v) => [`${bnNum(Number(v))} জন`, ""]}
                  labelFormatter={(l) => `${bnNum(Number(l))}–${bnNum(Number(l) + 9)} পার্সেন্টাইল`}
                />
                <Bar dataKey="count" isAnimationActive={false}>
                  {p.buckets.map((_, i) => (
                    <Cell key={i} fill={i === p.yourBucket ? chartColors.you : chartColors.bucket} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Says what the card actually does: `usePosition` takes only categoryId and mode —
              the endpoint has no window parameter — so the page's সময়কাল chip moves every other
              card on the screen and not this one. P2 removed the card's own control, which is
              what made the omission invisible; naming it is cheaper than a filter nobody
              believes. */}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            গাঢ় বারটিই আপনার অবস্থান। সময়কাল ফিল্টার এই কার্ডে প্রযোজ্য নয় — হিসাব সব র‍্যাঙ্কড
            পরীক্ষার। লাইভ পরীক্ষা সবার একসাথে বসার ন্যায্য তুলনা।
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
