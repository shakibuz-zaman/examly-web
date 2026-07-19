import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { QbankPaperDetail, QbankPapersResponse, QbankSearchResponse } from "./types";

export function useQbankPapers(trackId: string | null, categoryId: string | null, year: number | null) {
  return useQuery<QbankPapersResponse>({
    queryKey: ["qbank", "papers", trackId, categoryId, year],
    enabled: !!trackId,
    queryFn: async () => {
      const params = new URLSearchParams({ trackId: trackId!, pageSize: "100" });
      if (categoryId) params.set("categoryId", categoryId);
      if (year != null) params.set("year", String(year));
      return (await apiClient.get<QbankPapersResponse>(`/api/v1/qbank/papers?${params}`)).data;
    },
  });
}

export function useQbankPaper(id: string | undefined) {
  return useQuery<QbankPaperDetail>({
    queryKey: ["qbank", "paper", id],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<QbankPaperDetail>(`/api/v1/qbank/papers/${id}`)).data,
  });
}

export function useQbankSearch(q: string, opts: { trackId?: string | null; paperId?: string }) {
  return useQuery<QbankSearchResponse>({
    queryKey: ["qbank", "search", q, opts.paperId ?? opts.trackId],
    enabled: q.trim().length >= 2 && (!!opts.paperId || !!opts.trackId),
    queryFn: async () => {
      const params = new URLSearchParams({ q: q.trim() });
      if (opts.paperId) params.set("paperId", opts.paperId);
      else params.set("trackId", opts.trackId!);
      return (await apiClient.get<QbankSearchResponse>(`/api/v1/qbank/search?${params}`)).data;
    },
  });
}
