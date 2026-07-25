import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// «ভুলের খাতায় রাখুন» (plan 7c): idempotent neutral save — created:false means the
// question already had an entry.
export function useAddToNotebook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) =>
      (await apiClient.post<AddToNotebookResponse>("/api/v1/student/notebook", { questionId })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notebook"] });
    },
  });
}
