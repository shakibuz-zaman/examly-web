import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { BilingualText } from "./types";
import type { StrengthRow } from "./analytics";
import type { AnalyticsMode } from "../features/analytics/filters";

export type Funnel = { started: number; submitted: number; expired: number; inProgress: number };
export type ScoreHistogram = {
  buckets: number[]; medianPercent: number | null; topPercent: number | null;
};
export type ExamTopicRow = {
  nodeId: string | null; name: BilingualText | null;
  attempted: number; correct: number; accuracy: number; skipRate: number;
  children: ExamTopicRow[];
};
export type HardQuestion = {
  questionId: string; stemText: string; stemHtml: string;
  correctRate: number; skipRate: number; flags: string[];
};
export type ExamAnalyticsResponse = {
  funnel: Funnel; histogram: ScoreHistogram;
  topics: ExamTopicRow[]; hardestQuestions: HardQuestion[];
};

export type OrgKpis = {
  attempts30d: number; deltaVsPriorPct: number | null;
  activeStudents: number; medianScorePercent: number | null;
};
export type WeeklyPoint = { weekStartUtc: string; attempts: number; activeStudents: number };
export type HeatmapCell = { answers: number; errorRate: number } | null;
export type HeatmapExam = { examId: string; title: string; archived: boolean };
export type HeatmapRow = { nodeId: string | null; name: BilingualText | null; cells: HeatmapCell[] };
export type WeakTopic = {
  nodeId: string | null; name: BilingualText | null;
  subjectId: string | null; subjectName: BilingualText | null;
  answers: number; errorRate: number; bankQuestionCount: number;
};
export type OrgAnalyticsResponse = {
  kpis: OrgKpis; weekly: WeeklyPoint[];
  heatmapExams: HeatmapExam[]; heatmapRows: HeatmapRow[]; weakestTopics: WeakTopic[];
};

export type OrgAnalyticsFilters = {
  categoryId: string | null;
  modelTestId: string | null;
  mode: AnalyticsMode;
  fromUtc: string | null;   // ISO timestamps
  toUtc: string | null;
};

const STALE = 60_000; // analytics tolerate 60s staleness (spec §7/§8)

export function useExamAnalytics(examId: string | undefined, enabled: boolean) {
  return useQuery<ExamAnalyticsResponse>({
    queryKey: ["examiner-analytics", "exam", examId],
    enabled: !!examId && enabled,
    staleTime: STALE,
    // Same reasoning as useOrgAnalytics: `examId` is in the key, so walking from one exam's
    // অ্যানালাইসিস tab to another's collapsed four StatTiles, a 180px chart and two tables into
    // a six-row skeleton. The previous exam's slice stays mounted instead — which makes this
    // the first time `data` here can describe a DIFFERENT exam than the page header, so the
    // consumer owes it the saturate(.35)+aria-busy cue and must gate its «কেউ অংশ নেয়নি»
    // empty copy on `!isPlaceholderData`: that sentence is a claim about THIS exam.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await apiClient.get<ExamAnalyticsResponse>(`/api/v1/exams/${examId}/analytics`)).data,
  });
}

export function useAttemptBreakdown(examId: string | undefined, attemptId: string | null) {
  return useQuery<StrengthRow[]>({
    queryKey: ["examiner-analytics", "attempt", examId, attemptId],
    enabled: !!examId && !!attemptId,
    staleTime: STALE,
    queryFn: async () =>
      (await apiClient.get<StrengthRow[]>(
        `/api/v1/exams/${examId}/analytics/attempts/${attemptId}`)).data,
  });
}

// Keys on the whole filter object, so every ক্যাটাগরি / মডেল টেস্ট / মোড / তারিখ change is a NEW
// query key rather than a refetch: without placeholderData the dashboard collapsed to a
// full-page skeleton on each filter touch — KPI tiles, chart and heatmap all unmounting, a
// ~600px jump. keepPreviousData holds the previous slice on screen; the consumer marks it with
// the house saturate(.35) cue (never opacity) off `isPlaceholderData` and pairs it with
// aria-busy, and must not read an emptiness off placeholder data as if it described the
// current filters (the heatmap/weakest empty copy is a claim about the CURRENT window).
export function useOrgAnalytics(f: OrgAnalyticsFilters) {
  return useQuery<OrgAnalyticsResponse>({
    queryKey: ["examiner-analytics", "org", f],
    placeholderData: keepPreviousData,
    staleTime: STALE,
    queryFn: async () => {
      const p = new URLSearchParams();
      if (f.categoryId) p.set("categoryId", f.categoryId);
      if (f.modelTestId) p.set("modelTestId", f.modelTestId);
      if (f.mode !== "all") p.set("mode", f.mode);
      if (f.fromUtc) p.set("fromUtc", f.fromUtc);
      if (f.toUtc) p.set("toUtc", f.toUtc);
      const qs = p.toString();
      return (await apiClient.get<OrgAnalyticsResponse>(
        `/api/v1/analytics/org${qs ? `?${qs}` : ""}`)).data;
    },
  });
}
