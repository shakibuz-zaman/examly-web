import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiClient } from "./client";
import type { AddToNotebookResponse, NotebookResponse } from "./types";

export const NOTEBOOK_PAGE_SIZE = 20;

export function useNotebook({
  status,
  subjectId,
  trackId,
  page,
}: {
  status: "active" | "resolved";
  subjectId: string | null;
  trackId: string | null;
  page: number;
}) {
  return useQuery<NotebookResponse>({
    queryKey: ["notebook", trackId, status, subjectId, page],
    enabled: !!trackId,
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        trackId: trackId!,
        page: String(page),
        pageSize: String(NOTEBOOK_PAGE_SIZE),
      });
      if (subjectId) params.set("subjectId", subjectId);
      return (await apiClient.get<NotebookResponse>(`/api/v1/student/notebook?${params}`)).data;
    },
  });
}

// 7d list: infinite scroll, one status tab at a time. The subject chips stay client-side
// (they filter the already-loaded pages), so subjectId is deliberately not a parameter —
// picking a chip must not reset the scroll budget.
export function useInfiniteNotebook({
  status,
  trackId,
  pageSize,
}: {
  status: "active" | "resolved";
  trackId: string | null;
  pageSize: number;
}) {
  return useInfiniteQuery({
    queryKey: ["notebook", "infinite", trackId, status, pageSize],
    enabled: !!trackId,
    // Band counts (activeCount/dueCount) ride page 1 — keepPreviousData mirrors the
    // store/qbank pages so the subtitle never blanks on a tab flip.
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        status,
        trackId: trackId!,
        page: String(pageParam),
        pageSize: String(pageSize),
      });
      return (await apiClient.get<NotebookResponse>(`/api/v1/student/notebook?${params}`)).data;
    },
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

// «ভুলের খাতায় রাখুন» (plan 7c): neutral save. Three outcomes — created (a new entry),
// reactivated (one the student had already resolved is back in the revision pile), or
// neither (it was already active, so nothing changed).
export function useAddToNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) =>
      (await apiClient.post<AddToNotebookResponse>("/api/v1/student/notebook", { questionId })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notebook"] });
      // The home summary carries dueNotebookCount, so it goes stale too — same pair
      // the practice mutations invalidate.
      void qc.invalidateQueries({ queryKey: ["student"] });
    },
  });
}
