import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { BilingualText } from "./types";

export type ExamCategoryResponse = {
  id: string;
  name: BilingualText;
  slug: string;
  status: string;
  sortOrder: number;
};

export function useExamCategories() {
  return useQuery<ExamCategoryResponse[]>({
    queryKey: ["exam-categories"],
    staleTime: 5 * 60_000, // platform list changes rarely
    queryFn: async () =>
      (await apiClient.get<ExamCategoryResponse[]>("/api/v1/exam-categories")).data,
  });
}

export function categoryLabel(c: ExamCategoryResponse): string {
  return c.name.bn && c.name.en ? `${c.name.bn} — ${c.name.en}` : c.name.en ?? c.name.bn ?? c.slug;
}
