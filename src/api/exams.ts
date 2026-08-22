import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
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
    // A 404 is a FINAL answer — the id is wrong or the record is gone — and the builder acts
    // on it by leaving the route (ExamBuilderPage's `isError` effect toasts and replaces
    // the route with /exams). Under the default policy that bounce waited out three
    // retries with exponential backoff first, so a mistyped id sat on a skeleton for seconds
    // before the toast. Same predicate `useMyOrg` (api/me.ts) uses, with the fall-through kept
    // at TanStack's OWN default of three attempts rather than me.ts's two: only the 404 path
    // changes.
    retry: (failureCount, error) => {
      if (error instanceof AxiosError && error.response?.status === 404) return false;
      return failureCount < 3;
    },
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
    // `page` and `practice` are IN the key, so paging or flipping the র‍্যাঙ্কড/প্র্যাকটিস tab
    // is a new query, not a refetch: without this the whole table — pagination control
    // included — unmounted behind a skeleton on every page step, so the pager the reader had
    // just clicked vanished under the cursor. keepPreviousData holds the previous slice
    // mounted; the consumer marks it with the house saturate(.35) cue (never opacity) plus
    // aria-busy off `isPlaceholderData`, and MUST NOT let anything derived from placeholder
    // data speak about the current tab — the stat tiles, the header count and the table's
    // empty text are all claims about a cohort, and the placeholder belongs to the other one.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await apiClient.get<ExamResultsResponse>(
        `/api/v1/exams/${id}/results?page=${page}&pageSize=${pageSize}&practice=${practice}`)).data,
  });
}
