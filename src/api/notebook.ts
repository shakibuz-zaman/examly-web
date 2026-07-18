import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { NotebookResponse } from "./types";

export function useNotebook({
  status,
  subjectId,
  trackId,
}: {
  status: "active" | "resolved";
  subjectId: string | null;
  trackId: string | null;
}) {
  return useQuery<NotebookResponse>({
    queryKey: ["notebook", trackId, status, subjectId],
    enabled: !!trackId,
    queryFn: async () => {
      const params = new URLSearchParams({ status, trackId: trackId!, pageSize: "100" });
      if (subjectId) params.set("subjectId", subjectId);
      return (await apiClient.get<NotebookResponse>(`/api/v1/student/notebook?${params}`)).data;
    },
  });
}
