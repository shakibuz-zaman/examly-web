import { useQuery } from "@tanstack/react-query";
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

export function useOrgAnalytics(f: OrgAnalyticsFilters) {
  return useQuery<OrgAnalyticsResponse>({
    queryKey: ["examiner-analytics", "org", f],
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
