import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  ExamListFilters,
  ExamListResponse,
  ExamResponse,
  ExamResultsResponse,
  SaveExamRequest,
} from "./types";

function toParams(filters: ExamListFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.modelTestId) params.set("modelTestId", filters.modelTestId);
  if (filters.standalone) params.set("standalone", "true");
  return params;
}

export function useExams(filters: ExamListFilters) {
  return useQuery<ExamListResponse>({
    queryKey: ["exams", "list", filters],
    queryFn: async () =>
      (await apiClient.get<ExamListResponse>(`/api/v1/exams?${toParams(filters)}`)).data,
  });
}

export function useExam(id: string | undefined) {
  return useQuery<ExamResponse>({
    queryKey: ["exams", "detail", id],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<ExamResponse>(`/api/v1/exams/${id}`)).data,
  });
}

export function useSaveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveExamRequest }) =>
      id
        ? (await apiClient.put<ExamResponse>(`/api/v1/exams/${id}`, body)).data
        : (await apiClient.post<ExamResponse>("/api/v1/exams", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function usePublishExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<ExamResponse>(`/api/v1/exams/${id}/publish`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useUnpublishExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<ExamResponse>(`/api/v1/exams/${id}/unpublish`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useArchiveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/exams/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useRestoreExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<ExamResponse>(`/api/v1/exams/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useExamResults(
  id: string | undefined,
  page: number,
  pageSize: number,
  practice: boolean,
) {
  return useQuery<ExamResultsResponse>({
    queryKey: ["exams", "results", id, page, pageSize, practice],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<ExamResultsResponse>(
        `/api/v1/exams/${id}/results?page=${page}&pageSize=${pageSize}&practice=${practice}`)).data,
  });
}
