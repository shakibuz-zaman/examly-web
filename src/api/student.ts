import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
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

export function useCatalog(page: number, pageSize: number) {
  return useQuery<CatalogResponse>({
    queryKey: ["student", "catalog", page, pageSize],
    queryFn: async () =>
      (await apiClient.get<CatalogResponse>(
        `/api/v1/student/catalog?page=${page}&pageSize=${pageSize}`)).data,
  });
}

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
