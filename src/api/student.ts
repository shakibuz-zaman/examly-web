import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { StrengthRow } from "./analytics";
import type {
  AttemptReview,
  AttemptStatusResponse,
  AttemptTake,
  CatalogResponse,
  LeaderboardResponse,
  MyAttemptsResponse,
  SaveAnswersRequest,
  SaveAnswersResponse,
  StudentExam,
  StudentHomeResponse,
  StudentModelTest,
} from "./types";

// Phase 8 storefront: the catalog is server-scoped to a track (required) with optional
// collection / type / price / live filters. trackId absent → query disabled (the server 400s
// on an empty trackId).
export type CatalogParams = {
  trackId: string;
  collectionId?: string | null;
  type?: string | null;
  price?: string | null;
  live?: boolean;
  page: number;
  pageSize: number;
};

export function useCatalog(params: CatalogParams) {
  return useQuery<CatalogResponse>({
    queryKey: ["student", "catalog", params],
    enabled: !!params.trackId,
    queryFn: async () => {
      const q = new URLSearchParams();
      q.set("trackId", params.trackId);
      if (params.collectionId) q.set("collectionId", params.collectionId);
      if (params.type) q.set("type", params.type);
      if (params.price) q.set("price", params.price);
      if (params.live) q.set("live", "true");
      q.set("page", String(params.page));
      q.set("pageSize", String(params.pageSize));
      return (await apiClient.get<CatalogResponse>(`/api/v1/student/catalog?${q}`)).data;
    },
  });
}

// The student's owned library. Lives in commerce.ts (shares the ownership invalidation seam);
// re-exported here so student pages import it alongside the other student hooks.
export { useMyExams as useMyExamsList } from "./commerce";

export function useStudentHome(trackId: string | null) {
  return useQuery<StudentHomeResponse>({
    queryKey: ["student", "home", trackId],
    enabled: !!trackId,
    refetchInterval: 60_000,
    queryFn: async () =>
      (await apiClient.get<StudentHomeResponse>(
        `/api/v1/student/home?trackId=${trackId}`)).data,
  });
}

export function useStudentModelTest(id: string | undefined) {
  return useQuery<StudentModelTest>({
    queryKey: ["student", "model-test", id],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<StudentModelTest>(`/api/v1/student/model-tests/${id}`)).data,
  });
}

export function useStudentExam(id: string | undefined) {
  return useQuery<StudentExam>({
    queryKey: ["student", "exam", id],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<StudentExam>(`/api/v1/student/exams/${id}`)).data,
  });
}

export function useStartAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (examId: string) =>
      (await apiClient.post<AttemptTake>(`/api/v1/student/exams/${examId}/attempts`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student"] }),
  });
}

// NO invalidation — this fires on every answer change; invalidating would refetch
// the runner's own data mid-exam.
export function useSaveAnswers() {
  return useMutation({
    mutationFn: async ({ attemptId, body }: { attemptId: string; body: SaveAnswersRequest }) =>
      (await apiClient.put<SaveAnswersResponse>(
        `/api/v1/student/attempts/${attemptId}/answers`, body)).data,
  });
}

export function useSubmitAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attemptId: string) =>
      (await apiClient.post<AttemptStatusResponse>(
        `/api/v1/student/attempts/${attemptId}/submit`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["student"] });
      void qc.invalidateQueries({ queryKey: ["attempts"] });
    },
  });
}

export function useAttemptStatus(
  id: string | undefined,
  opts?: { refetchInterval?: number | false },
) {
  return useQuery<AttemptStatusResponse>({
    queryKey: ["attempts", "status", id],
    enabled: !!id,
    refetchInterval: opts?.refetchInterval ?? false,
    queryFn: async () =>
      (await apiClient.get<AttemptStatusResponse>(`/api/v1/student/attempts/${id}`)).data,
  });
}

// retry: false — a 409 (locked until reveal) must not retry-spam the API.
export function useAttemptReview(id: string | undefined, enabled: boolean) {
  return useQuery<AttemptReview>({
    queryKey: ["attempts", "review", id],
    enabled: !!id && enabled,
    retry: false,
    queryFn: async () =>
      (await apiClient.get<AttemptReview>(`/api/v1/student/attempts/${id}/review`)).data,
  });
}

// retry: false — 409 (pre-reveal) / 404 (foreign) must not retry-spam the API.
export function useAttemptTopics(id: string, enabled: boolean) {
  return useQuery<StrengthRow[]>({
    queryKey: ["student", "attempt-topics", id],
    enabled: !!id && enabled,
    retry: false,
    queryFn: async () =>
      (await apiClient.get<StrengthRow[]>(`/api/v1/student/attempts/${id}/topics`)).data,
  });
}

export function useLeaderboard(
  examId: string | undefined,
  enabled: boolean,
  page: number,
  pageSize: number,
) {
  return useQuery<LeaderboardResponse>({
    queryKey: ["student", "leaderboard", examId, page, pageSize],
    enabled: !!examId && enabled,
    retry: false,
    queryFn: async () =>
      (await apiClient.get<LeaderboardResponse>(
        `/api/v1/student/exams/${examId}/leaderboard?page=${page}&pageSize=${pageSize}`)).data,
  });
}

export function useMyAttempts(page: number, pageSize: number) {
  return useQuery<MyAttemptsResponse>({
    queryKey: ["student", "me", page, pageSize],
    queryFn: async () =>
      (await apiClient.get<MyAttemptsResponse>(
        `/api/v1/student/me/attempts?page=${page}&pageSize=${pageSize}`)).data,
  });
}
