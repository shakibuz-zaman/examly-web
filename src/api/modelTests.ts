import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { apiClient } from "./client";
import type {
  ExamResponse,
  ModelTestListFilters,
  ModelTestListResponse,
  ModelTestResponse,
  SaveExamRequest,
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
    // A 404 is a FINAL answer — the id is wrong or the record is gone — and the builder acts
    // on it by leaving the route (ModelTestBuilderPage's `isError` effect toasts and replaces
    // the route with /model-tests). Under the default policy that bounce waited out three
    // retries with exponential backoff first, so a mistyped id sat on a skeleton for seconds
    // before the toast. Same predicate `useMyOrg` (api/me.ts) uses, with the fall-through kept
    // at TanStack's OWN default of three attempts rather than me.ts's two: only the 404 path
    // changes.
    retry: (failureCount, error) => {
      if (error instanceof AxiosError && error.response?.status === 404) return false;
      return failureCount < 3;
    },
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

// POST /api/v1/model-tests/{id}/exams — an exam born inside a draft bundle (spec C1). The
// server appends it to the bundle and sets the back-reference, so both caches go stale.
export function useCreateBundleExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelTestId, body }: { modelTestId: string; body: SaveExamRequest }) =>
      (await apiClient.post<ExamResponse>(`/api/v1/model-tests/${modelTestId}/exams`, body)).data,
    onSuccess: () => invalidateBoth(qc),
  });
}
