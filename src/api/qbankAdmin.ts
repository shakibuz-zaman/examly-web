import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { apiClient } from "./client";
import type {
  AdminPaper,
  AdminPaperFilters,
  AdminPaperList,
  CreatePaperRequest,
  ImportReport,
  QbankQuestion,
  SaveQbankQuestionRequest,
  UpdatePaperRequest,
} from "./types";

const base = "/api/v1/admin/qbank";

function toParams(filters: AdminPaperFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.status) params.set("status", filters.status);
  if (filters.year != null) params.set("year", String(filters.year));
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  return params;
}

export function useAdminPapers(filters: AdminPaperFilters) {
  return useQuery<AdminPaperList>({
    queryKey: ["admin-qbank", "papers", filters],
    queryFn: async () =>
      (await apiClient.get<AdminPaperList>(`${base}/papers?${toParams(filters)}`)).data,
  });
}

export function useAdminPaper(id: string | undefined) {
  return useQuery<AdminPaper>({
    queryKey: ["admin-qbank", "paper", id],
    enabled: !!id,
    queryFn: async () => (await apiClient.get<AdminPaper>(`${base}/papers/${id}`)).data,
    // A 404 here is a FINAL answer — the id is wrong or the paper is gone — and the page
    // acts on it by navigating back to the list (AdminQbankPaperPage's `notFound` branch).
    // Under the default policy that bounce waited out three retries with exponential
    // backoff first, so a mistyped id sat on a skeleton for seconds before the toast. Same
    // predicate `useMyOrg` (api/me.ts) already uses for the same reason — except that the
    // fall-through keeps TanStack's OWN default of three attempts (`failureCount < 3`)
    // rather than me.ts's two, so this hook's behaviour on every other status is byte-for-
    // byte what it was: only the 404 path changes.
    retry: (failureCount, error) => {
      if (error instanceof AxiosError && error.response?.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useCreatePaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreatePaperRequest) =>
      (await apiClient.post<AdminPaper>(`${base}/papers`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-qbank"] }),
  });
}

export function useUpdatePaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdatePaperRequest }) =>
      (await apiClient.put<AdminPaper>(`${base}/papers/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-qbank"] }),
  });
}

export function useSetPaperStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "activate" | "archive" }) =>
      (await apiClient.post<AdminPaper>(`${base}/papers/${id}/${action}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-qbank"] }),
  });
}

export function useAdminPaperQuestions(id: string | undefined) {
  return useQuery<QbankQuestion[]>({
    queryKey: ["admin-qbank", "questions", id],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<QbankQuestion[]>(`${base}/papers/${id}/questions`)).data,
  });
}

export function useSaveQbankQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paperId,
      qid,
      body,
    }: {
      paperId: string;
      qid?: string;
      body: SaveQbankQuestionRequest;
    }) =>
      qid
        ? (await apiClient.put<QbankQuestion>(`${base}/questions/${qid}`, body)).data
        : (await apiClient.post<QbankQuestion>(`${base}/papers/${paperId}/questions`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-qbank"] }),
  });
}

export function useDeleteQbankQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ qid }: { qid: string }) => {
      await apiClient.delete(`${base}/questions/${qid}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-qbank"] }),
  });
}

export function useImportQuestions(paperId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: SaveQbankQuestionRequest[]) =>
      (await apiClient.post<ImportReport>(`${base}/papers/${paperId}/questions/import`, rows)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-qbank"] }),
  });
}
