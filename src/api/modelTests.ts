import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  ModelTestListFilters,
  ModelTestListResponse,
  ModelTestResponse,
  SaveModelTestRequest,
} from "./types";

function toParams(filters: ModelTestListFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  return params;
}

export function useModelTests(filters: ModelTestListFilters) {
  return useQuery<ModelTestListResponse>({
    queryKey: ["model-tests", "list", filters],
    queryFn: async () =>
      (await apiClient.get<ModelTestListResponse>(`/api/v1/model-tests?${toParams(filters)}`)).data,
  });
}

export function useModelTest(id: string | undefined) {
  return useQuery<ModelTestResponse>({
    queryKey: ["model-tests", "detail", id],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<ModelTestResponse>(`/api/v1/model-tests/${id}`)).data,
  });
}

// Membership changes rewrite Exam.ModelTestId server-side, so exam queries go stale too.
function invalidateBoth(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["model-tests"] });
  void qc.invalidateQueries({ queryKey: ["exams"] });
}

export function useSaveModelTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveModelTestRequest }) =>
      id
        ? (await apiClient.put<ModelTestResponse>(`/api/v1/model-tests/${id}`, body)).data
        : (await apiClient.post<ModelTestResponse>("/api/v1/model-tests", body)).data,
    onSuccess: () => invalidateBoth(qc),
  });
}

export function usePublishModelTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<ModelTestResponse>(`/api/v1/model-tests/${id}/publish`)).data,
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useUnpublishModelTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<ModelTestResponse>(`/api/v1/model-tests/${id}/unpublish`)).data,
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useArchiveModelTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/model-tests/${id}`);
    },
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useRestoreModelTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<ModelTestResponse>(`/api/v1/model-tests/${id}/restore`)).data,
    onSuccess: () => invalidateBoth(qc),
  });
}
