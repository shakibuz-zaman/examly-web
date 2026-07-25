import { useInfiniteQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { QbankPaperDetail, QbankPapersResponse, QbankSearchResponse } from "./types";

export const QBANK_PAPERS_PAGE_SIZE = 20;

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

export type InfiniteQbankPapersParams = {
  trackId: string;
  categoryId?: string | null;
  pageSize: number;
};

export function useInfiniteQbankPapers(params: InfiniteQbankPapersParams) {
  return useInfiniteQuery({
    queryKey: ["qbank", "papers", "infinite", params],
    enabled: !!params.trackId,
    // Band subtitle rides page 1 (trackTotal); keepPreviousData mirrors the store —
    // without it every filter change blanks the subtitle to «—».
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams({
        trackId: params.trackId,
        page: String(pageParam),
        pageSize: String(params.pageSize),
      });
      if (params.categoryId) search.set("categoryId", params.categoryId);
      return (await apiClient.get<QbankPapersResponse>(`/api/v1/qbank/papers?${search}`)).data;
    },
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

// Track-wide question-text search (§7) — the server endpoint already paginates.
export function useInfiniteQbankSearch(q: string, trackId: string | null, pageSize: number) {
  const query = q.trim();
  return useInfiniteQuery({
    queryKey: ["qbank", "search", "infinite", query, trackId, pageSize],
    enabled: query.length >= 2 && !!trackId,
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams({
        q: query,
        trackId: trackId!,
        page: String(pageParam),
        pageSize: String(pageSize),
      });
      return (await apiClient.get<QbankSearchResponse>(`/api/v1/qbank/search?${search}`)).data;
    },
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}
