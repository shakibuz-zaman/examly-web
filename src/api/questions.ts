import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  QuestionListFilters,
  QuestionListResponse,
  QuestionResponse,
  SaveQuestionRequest,
} from "./types";

// ASP.NET expects repeated params (tags=a&tags=b), not axios's default tags[]=a.
function toParams(filters: QuestionListFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.search) params.set("search", filters.search);
  if (filters.subjectId) params.set("subjectId", filters.subjectId);
  if (filters.topicId) params.set("topicId", filters.topicId);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.language) params.set("language", filters.language);
  if (filters.status) params.set("status", filters.status);
  for (const tag of filters.tags ?? []) params.append("tags", tag);
  return params;
}

export function useQuestions(filters: QuestionListFilters) {
  return useQuery<QuestionListResponse>({
    queryKey: ["questions", "list", filters],
    queryFn: async () =>
      (await apiClient.get<QuestionListResponse>(`/api/v1/questions?${toParams(filters)}`)).data,
  });
}

export function useQuestion(id: string | undefined) {
  return useQuery<QuestionResponse>({
    queryKey: ["questions", "detail", id],
    enabled: !!id,
    queryFn: async () =>
      (await apiClient.get<QuestionResponse>(`/api/v1/questions/${id}`)).data,
  });
}

export function useSaveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: SaveQuestionRequest }) =>
      id
        ? (await apiClient.put<QuestionResponse>(`/api/v1/questions/${id}`, body)).data
        : (await apiClient.post<QuestionResponse>("/api/v1/questions", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useArchiveQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/questions/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useRestoreQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<QuestionResponse>(`/api/v1/questions/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useCloneQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<QuestionResponse>(`/api/v1/questions/${id}/clone`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useQuestionTags() {
  return useQuery<string[]>({
    queryKey: ["questions", "tags"],
    queryFn: async () => (await apiClient.get<string[]>("/api/v1/questions/tags")).data,
  });
}
