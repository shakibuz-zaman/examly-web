import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { BilingualText } from "./types";
import { analyticsQueryString, type AnalyticsFilters, type AnalyticsMode } from "../features/analytics/filters";

export type TrendPoint = {
  attemptId: string; examId: string; examTitle: string; submittedAtUtc: string;
  scorePercent: number; percentile: number | null; examTopScorePercent: number; isPractice: boolean;
};
export type DifficultyRow = { difficulty: string; attempted: number; correct: number; accuracy: number };
export type StrategyCard = {
  examTitle: string; wrong: number; marksLost: number;
  score: number; scoreIfWrongsSkipped: number; ranksGained: number;
};
export type OverviewResponse = {
  examsTaken: number; practiceRetakes: number; overallAccuracy: number;
  avgPercentile: number | null; focusAreaLabel: string | null;
  trend: TrendPoint[]; difficulty: DifficultyRow[]; strategy: StrategyCard | null;
};
export type StrengthRow = {
  nodeId: string | null; name: BilingualText | null; attempted: number; correct: number;
  accuracy: number; peerAccuracy: number | null; lowSample: boolean; subtopics: StrengthRow[];
};
export type TopicTrendPoint = {
  examId: string; examTitle: string; submittedAtUtc: string;
  n: number; k: number; accuracy: number;
  peerAccuracy: number | null; topAccuracy: number | null; lowSample: boolean;
};
export type PositionResponse = {
  participants: number; examCount: number; yourAvgPercentile: number | null;
  buckets: number[]; yourBucket: number | null;
};

const STALE = 60_000; // analytics tolerate 60s staleness (spec §7)

export function useAnalyticsOverview(f: AnalyticsFilters) {
  return useQuery<OverviewResponse>({
    queryKey: ["analytics", "overview", f],
    staleTime: STALE,
    queryFn: async () =>
      (await apiClient.get<OverviewResponse>(
        `/api/v1/student/analytics/overview${analyticsQueryString(f)}`)).data,
  });
}

export function useStrength(f: AnalyticsFilters) {
  return useQuery<StrengthRow[]>({
    queryKey: ["analytics", "strength", f],
    staleTime: STALE,
    queryFn: async () =>
      (await apiClient.get<StrengthRow[]>(
        `/api/v1/student/analytics/strength${analyticsQueryString(f)}`)).data,
  });
}

export function useSubjectStrength(f: AnalyticsFilters, subjectId: string | null) {
  return useQuery<StrengthRow[]>({
    queryKey: ["analytics", "strength", subjectId, f],
    enabled: !!subjectId,
    staleTime: STALE,
    queryFn: async () =>
      (await apiClient.get<StrengthRow[]>(
        `/api/v1/student/analytics/strength/${subjectId}${analyticsQueryString(f)}`)).data,
  });
}

export type TrendNode = { subjectId: string } | { topicId: string };

export function useTopicTrend(f: AnalyticsFilters, node: TrendNode | null) {
  return useQuery<TopicTrendPoint[]>({
    queryKey: ["analytics", "topic-trend", node, f],
    enabled: node !== null,
    staleTime: STALE,
    queryFn: async () => {
      const base = analyticsQueryString(f);
      const sep = base ? "&" : "?";
      const nodeParam = node && "subjectId" in node
        ? `subjectId=${node.subjectId}` : `topicId=${(node as { topicId: string }).topicId}`;
      return (await apiClient.get<TopicTrendPoint[]>(
        `/api/v1/student/analytics/topic-trend${base}${sep}${nodeParam}`)).data;
    },
  });
}

export function usePosition(categoryId: string | null, mode: AnalyticsMode) {
  return useQuery<PositionResponse>({
    queryKey: ["analytics", "position", categoryId, mode],
    staleTime: STALE,
    queryFn: async () => {
      const p = new URLSearchParams();
      if (categoryId) p.set("categoryId", categoryId);
      p.set("mode", mode);
      return (await apiClient.get<PositionResponse>(
        `/api/v1/student/analytics/position?${p.toString()}`)).data;
    },
  });
}
