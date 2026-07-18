import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { BilingualText } from "./types";

export type CategoryKind = "section" | "track" | "collection";

export type ExamCategoryResponse = {
  id: string;
  name: BilingualText;
  slug: string;
  status: string;
  sortOrder: number;
  parentCategoryId: string | null;
  kind: CategoryKind;
};

export type CategoryNode = ExamCategoryResponse & { children: CategoryNode[] };

export type CreateExamCategoryRequest = {
  name: BilingualText;
  slug?: string;
  sortOrder: number;
  kind?: CategoryKind;
  parentCategoryId?: string | null;
};

export type UpdateExamCategoryRequest = {
  name?: BilingualText;
  slug?: string;
  status?: string;
  sortOrder?: number;
  // API tri-state: absent = unchanged, "" = clear to root, id = reparent.
  parentCategoryId?: string;
};

export function buildCategoryTree(flat: ExamCategoryResponse[]): CategoryNode[] {
  const nodes = new Map(flat.map((c) => [c.id, { ...c, children: [] as CategoryNode[] }]));
  const roots: CategoryNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.parentCategoryId ? nodes.get(n.parentCategoryId) : undefined;
    (parent ? parent.children : roots).push(n);
  }
  const bySort = (a: CategoryNode, b: CategoryNode) =>
    a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug);
  const sortRec = (list: CategoryNode[]) => {
    list.sort(bySort);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export function useExamCategories() {
  return useQuery<ExamCategoryResponse[]>({
    queryKey: ["exam-categories"],
    staleTime: 5 * 60_000, // platform list changes rarely
    queryFn: async () =>
      (await apiClient.get<ExamCategoryResponse[]>("/api/v1/exam-categories")).data,
  });
}

export function useAdminExamCategories() {
  return useQuery<ExamCategoryResponse[]>({
    queryKey: ["exam-categories", "admin"],
    queryFn: async () =>
      (await apiClient.get<ExamCategoryResponse[]>("/api/v1/admin/exam-categories")).data,
  });
}

export function useCreateExamCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateExamCategoryRequest) =>
      (await apiClient.post<ExamCategoryResponse>("/api/v1/admin/exam-categories", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-categories"] }),
  });
}

export function useUpdateExamCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateExamCategoryRequest }) =>
      (await apiClient.patch<ExamCategoryResponse>(`/api/v1/admin/exam-categories/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exam-categories"] }),
  });
}

export function categoryLabel(c: ExamCategoryResponse): string {
  return c.name.bn && c.name.en ? `${c.name.bn} — ${c.name.en}` : c.name.en ?? c.name.bn ?? c.slug;
}
