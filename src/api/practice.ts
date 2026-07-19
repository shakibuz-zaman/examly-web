import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  AnswerPracticeResponse,
  CompletePracticeResponse,
  PracticeSession,
  StartPracticeRequest,
} from "./types";

export function useStartPractice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: StartPracticeRequest) =>
      (await apiClient.post<PracticeSession>("/api/v1/student/practice", req)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student"] });
      qc.invalidateQueries({ queryKey: ["notebook"] });
      qc.invalidateQueries({ queryKey: ["practice"] });
    },
  });
}

export function usePracticeSession(id: string | undefined) {
  return useQuery<PracticeSession>({
    queryKey: ["practice", id],
    enabled: !!id,
    queryFn: async () => (await apiClient.get<PracticeSession>(`/api/v1/student/practice/${id}`)).data,
  });
}

export function useAnswerPractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: { itemId: string; selectedOptionIds: string[] }) =>
      (await apiClient.post<AnswerPracticeResponse>(`/api/v1/student/practice/${id}/answers`, req)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice", id] }),
  });
}

export function useCompletePractice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<CompletePracticeResponse>(`/api/v1/student/practice/${id}/complete`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["practice", id] });
      qc.invalidateQueries({ queryKey: ["student"] }); // home streak/practice blocks
      qc.invalidateQueries({ queryKey: ["notebook"] });
    },
  });
}
