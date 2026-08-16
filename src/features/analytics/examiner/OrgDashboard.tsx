import { useState } from "react";
import { Card, Col, DatePicker, Row, Select, Skeleton, Typography } from "antd";
import type { Dayjs } from "dayjs";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useOrgAnalytics } from "../../../api/examinerAnalytics";
import { categoryShortLabel, useExamCategories } from "../../../api/categories";
import { useModelTests } from "../../../api/modelTests";
import { useAuth } from "../../../auth/useAuth";
import { bnNum } from "../../../lib/bn";
import { formatDhakaDayMonthBn } from "../../../lib/format";
import { ANALYTICS_MODE } from "../../../lib/labels";
import { EmptyState } from "../../../ui/EmptyState";
import { FilterChips } from "../../../ui/FilterChips";
import { PageHeader } from "../../../ui/PageHeader";
import { RetryNotice } from "../../../ui/RetryNotice";
import { StatTile } from "../../../ui/StatTile";
import type { AnalyticsMode } from "../filters";
import { useChartColors } from "../chartTheme";
import { WeaknessHeatmap } from "./WeaknessHeatmap";
import { WeakestTopicsList } from "./WeakestTopicsList";

const MODES: AnalyticsMode[] = ["all", "live", "open"];

// Lazy-loaded from DashboardPage (recharts must stay out of the main bundle).
//
// Role split, NOT a permission check. routes.tsx maps /dashboard to this page for examiners
// AND platform admins, but an admin owns no organization — `GET /api/v1/analytics/org`
// answers them 403, so the org-scoped body below would fire three requests and paint the
// «ডেটা আনা যায়নি» branch on a landing page that is simply not theirs. The queries live in
// the inner component so the admin path never mounts them (a hook cannot be skipped, a
// component can). Giving platform admins a dashboard of their OWN is 7g scope; this is the
// honest placeholder until then, not the feature.
export function OrgDashboard() {
  const { user } = useAuth();
  return user?.role === "platform_admin" ? <AdminNoOrgLanding /> : <ExaminerOrgDashboard />;
}

function AdminNoOrgLanding() {
  return (
    <>
      <PageHeader
        title="ড্যাশবোর্ড"
        summary="প্ল্যাটফর্ম অ্যাডমিন অ্যাকাউন্ট কোনো প্রতিষ্ঠানের মালিক নয়।"
      />
      <EmptyState
        variant="empty"
        message="প্রতিষ্ঠানের অ্যানালিটিক্স শুধু সেই প্রতিষ্ঠানের নিজের অ্যাকাউন্টে দেখা যায়। প্ল্যাটফর্ম অ্যাডমিনের আলাদা ড্যাশবোর্ড এখনো তৈরি হয়নি।"
        actionLabel="অর্ডার দেখুন"
        actionTo="/admin/orders"
      />
    </>
  );
}

function ExaminerOrgDashboard() {
  const chartColors = useChartColors();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [modelTestId, setModelTestId] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalyticsMode>("all");
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const categories = useExamCategories();
  const modelTests = useModelTests({ page: 1, pageSize: 50 });
  const org = useOrgAnalytics({
    categoryId,
    modelTestId,
    mode,
    fromUtc: range ? range[0].startOf("day").toISOString() : null,
    toUtc: range ? range[1].endOf("day").toISOString() : null,
  });

  const d = org.data;
  const delta = d?.kpis.deltaVsPriorPct ?? null;
  // One query owns every pixel below the filter row, so ONE cue covers them all. Splitting it
  // per card would be the student-page mistake in reverse: there the cards run independent
  // queries and a shared cue lies, here they do not and per-card filters would multiply
  // (.35 × .35 ≈ .12, which reads as broken rather than stale).
  const stale = org.isPlaceholderData;
  const staleStyle = {
    filter: stale ? "saturate(0.35)" : undefined,
    transition: "filter .2s",
  } as const;

  // Honest window copy. The KPI trio is a rolling 30 days anchored at the range END
  // (toUtc ?? now) while the chart covers the whole picked range — server contract,
  // AnalyticsDtos.cs:36. Saying «গত ৩০ দিন» under a custom range would be a lie about
  // both halves, so the summary names each window separately once a range is set.
  // `endOf("day")` matches what the query actually sends as toUtc. A bare `range[1]` is
  // midnight local, and for a Dhaka evening pick that rolls the label back a day against the
  // window the server anchored on.
  const summary = range
    ? `কেপিআই ${formatDhakaDayMonthBn(range[1].endOf("day").toISOString())} পর্যন্ত ৩০ দিনের · গ্রাফ নির্বাচিত সময়ের`
    : "কেপিআই গত ৩০ দিনের · গ্রাফ শেষ ১২ সপ্তাহের";

  return (
    <>
      <PageHeader title="প্রতিষ্ঠানের অ্যানালিটিক্স" summary={summary} />

      {/* flexWrap beyond .ex-filterrow's own rules: four controls at their minimum widths
          overflow the content column on a collapsed rail, and the shell contains its own
          horizontal overflow — so without wrapping the row would scroll sideways instead. */}
      <div className="ex-filterrow" style={{ flexWrap: "wrap" }}>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="সব ক্যাটাগরি"
          style={{ minWidth: 170 }}
          value={categoryId ?? undefined}
          options={(categories.data ?? []).map((c) => ({
            value: c.id,
            // Short (Bengali-first) label, not the "bn — en" combo: this is chrome on a
            // Bengali surface, and the combo re-introduces the half-translation D17 killed.
            label: categoryShortLabel(c),
          }))}
          onChange={(v) => setCategoryId(v ?? null)}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="সব মডেল টেস্ট"
          style={{ minWidth: 170 }}
          value={modelTestId ?? undefined}
          options={(modelTests.data?.items ?? []).map((m) => ({ value: m.id, label: m.title }))}
          onChange={(v) => setModelTestId(v ?? null)}
        />
        <FilterChips
          items={MODES.map((m) => ({
            key: m,
            label: ANALYTICS_MODE[m],
            selected: mode === m,
            // "all" is the default, but tapping the selected chip must not clear it — this is
            // a one-of-three mode, not a toggle; there is no "no mode".
            onClick: () => setMode(m),
          }))}
        />
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => setRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
          allowClear
          placeholder={["শুরুর তারিখ", "শেষ তারিখ"]}
        />
      </div>

      {/* Three states, not two (the 6b ticket). The old head was `isLoading || !data`, so a
          failed load sat on a live-looking skeleton forever with no message and no way out.
          isPending is the real first-load state now that placeholderData keeps the previous
          slice on screen; failure gets its own branch with a retry.
          The branch keys on `!d`, not on `isError`, and the distinction is narrower than it
          looks. TanStack only keeps `data` through a SAME-KEY refetch failure: state.data
          survives the flip to status "error", so the numbers we already hold stay renderable
          and `isError || !d` would throw them away for «ডেটা আনা যায়নি» — a worse lie than the
          one this fixes. A NEW-key fetch that fails keeps nothing, because placeholder
          substitution is gated on `status === "pending"` (query-core 5.100.10,
          queryObserver.js:265); the moment the fetch errors the status leaves pending, the
          placeholder is dropped, `d` is undefined and this branch paints the full panel —
          identical to what `isError || !d` would have done. (That gate is also why
          `isPlaceholderData && isError` is unreachable, so the stale cue and the strip below
          can never appear together.) `!d` alone still covers the original hang: "settled and
          dataless" lands here whether or not the query called itself an error. */}
      {org.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !d ? (
        <RetryNotice tone="panel" busy={org.isFetching} onRetry={() => void org.refetch()} />
      ) : (
        <div aria-busy={stale} style={staleStyle}>
          {org.isError && (
            <RetryNotice tone="strip" busy={org.isFetching} onRetry={() => void org.refetch()} />
          )}
          <div className="ex-stattiles ex-stattiles--3">
            <StatTile
              label="অ্যাটেম্পট (৩০ দিন)"
              // Zero is not a direction. `delta >= 0` would paint «▲ ০% বেশি» in green — an
              // arrow and a colour asserting growth that did not happen — so the flat case
              // skips StatTile's `delta` entirely and renders its own neutral sub-line: the
              // same .ex-stattile-delta type ramp with no is-up/is-down class, hence no glyph
              // and no green/coral. It rides inside `value` (a ReactNode) because that is the
              // only slot a caller owns; a real "flat" direction on the primitive is T11's,
              // and StatTile is not touched here.
              value={
                delta === 0 ? (
                  <>
                    {bnNum(d.kpis.attempts30d)}
                    <div className="ex-stattile-delta" style={{ fontWeight: 400 }}>
                      আগের ৩০ দিনের সমান
                    </div>
                  </>
                ) : (
                  bnNum(d.kpis.attempts30d)
                )
              }
              // WCAG 1.4.1: the direction lives in the WORD («বেশি»/«কম»), so the arrow and
              // the green/coral are decoration on top of text that already says it. The old
              // «▲ 12% vs prior» carried the meaning in glyph + colour alone.
              delta={
                delta === null || delta === 0
                  ? undefined
                  : {
                    direction: delta > 0 ? "up" : "down",
                    text: `${bnNum(Math.abs(delta))}% ${delta > 0 ? "বেশি" : "কম"} আগের ৩০ দিনের চেয়ে`,
                  }
              }
            />
            <StatTile label="সক্রিয় শিক্ষার্থী" value={bnNum(d.kpis.activeStudents)} />
            <StatTile
              label="মিডিয়ান স্কোর"
              // The server rounds to 2 decimals, and bnNum only rewrites digits — «৬৬.৬৭»
              // keeps the dot, which is the Bengali decimal separator too.
              value={d.kpis.medianScorePercent === null ? "—" : bnNum(d.kpis.medianScorePercent)}
              suffix={d.kpis.medianScorePercent === null ? undefined : "%"}
            />
          </div>
          {/* The qualifier the old English label carried inline ("ranked, 30d"). It cannot go
              back in the tile label — the label is the spec's — but dropping it would let a
              practice-heavy org read its median as everyone's. */}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            মিডিয়ান স্কোর শুধু র‍্যাঙ্কড অ্যাটেম্পট থেকে — প্র্যাকটিস রিটেক এতে নেই।
          </Typography.Text>

          <Card title="সাপ্তাহিক অংশগ্রহণ" style={{ marginTop: 12 }}>
            <div
              role="img"
              aria-label="সাপ্তাহিক অংশগ্রহণের রেখাচিত্র — প্রতি সপ্তাহে ফাইনালাইজড অ্যাটেম্পট ও স্বতন্ত্র শিক্ষার্থী"
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={d.weekly.map((p) => ({
                    // Dhaka-pinned short date, the same formatter the student charts use.
                    // The bucket key itself is a UTC Monday (server), so this is a label,
                    // never a value anything is recomputed from.
                    week: formatDhakaDayMonthBn(p.weekStartUtc),
                    attempts: p.attempts,
                    students: p.activeStudents,
                  }))}
                >
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: chartColors.axis }} />
                  {/* RULING (7f review): chart axis tick numbers are Bengali app-wide, as in
                      PositionCard and TopicProgressCard. D8's Western digits stay scoped to
                      TABLE data — score and money columns, e.g. the weakest-topics grid. */}
                  <YAxis allowDecimals={false} tickFormatter={(v) => bnNum(v)}
                    tick={{ fontSize: 10, fill: chartColors.axis }} width={28} />
                  <Tooltip
                    formatter={(v, name) => [
                      bnNum(Number(v)),
                      name === "attempts" ? "ফাইনালাইজড অ্যাটেম্পট" : "স্বতন্ত্র শিক্ষার্থী",
                    ]}
                    // «সপ্তাহ শুরু ২৫ জুলাই», not a genitive on the date: the -এর form
                    // misdeclines 4 of the 12 Bengali month names.
                    labelFormatter={(l) => `সপ্তাহ শুরু ${l}`}
                  />
                  <Line dataKey="attempts" stroke={chartColors.you} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line dataKey="students" stroke={chartColors.peer} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Thickness is named alongside the colour on purpose: the two series differ by
                strokeWidth (2 vs 1.5) as well as hue, so the legend does not hand the whole
                distinction to colour (1.4.1). */}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              মোটা নীল রেখা = সপ্তাহে ফাইনালাইজড অ্যাটেম্পট · সরু ধূসর রেখা = স্বতন্ত্র শিক্ষার্থী।
              ডিফল্ট সময়সীমা শেষ ১২ সপ্তাহ।
            </Typography.Text>
          </Card>

          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            {/* `stale` is only consulted by their EMPTY branches. A non-empty card may show
                held rows desaturated, but emptiness is a CLAIM about the filters now in the
                chips — and while the placeholder is up it describes the PREVIOUS ones. The
                saturate cue cannot carry that: the empty copy is achromatic grey, so
                saturate() is a visual no-op on it and the claim would land with no cue at
                all. Same guard as TopicProgressCard, and the rule useOrgAnalytics states. */}
            <Col xs={24} xl={14}>
              <WeaknessHeatmap exams={d.heatmapExams} rows={d.heatmapRows} stale={stale} />
            </Col>
            <Col xs={24} xl={10}>
              <WeakestTopicsList rows={d.weakestTopics} stale={stale} />
            </Col>
          </Row>
        </div>
      )}
    </>
  );
}
