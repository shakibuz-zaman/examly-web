import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  CreateSubjectRequest, CreateTopicRequest,
  SubjectResponse, TopicResponse,
  UpdateSubjectRequest, UpdateTopicRequest,
} from "./types";

type Mode = "examiner" | "admin";

const base = (mode: Mode) =>
  mode === "admin" ? "/api/v1/admin/taxonomy" : "/api/v1/taxonomy";

export function useSubjects(mode: Mode) {
  return useQuery<SubjectResponse[]>({
    queryKey: ["taxonomy", mode, "subjects"],
    queryFn: async () => (await apiClient.get<SubjectResponse[]>(`${base(mode)}/subjects`)).data,
  });
}

export function useTopics(mode: Mode, subjectId: string | null) {
  return useQuery<TopicResponse[]>({
    queryKey: ["taxonomy", mode, "subjects", subjectId, "topics"],
    enabled: !!subjectId,
    queryFn: async () =>
      (await apiClient.get<TopicResponse[]>(`${base(mode)}/subjects/${subjectId}/topics`)).data,
  });
}

export function useCreateSubject(mode: Mode) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSubjectRequest) =>
      (await apiClient.post<SubjectResponse>(`${base(mode)}/subjects`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taxonomy", mode, "subjects"] }),
  });
}

export function useUpdateSubject(mode: Mode) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateSubjectRequest }) =>
      (await apiClient.patch<SubjectResponse>(`${base(mode)}/subjects/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taxonomy", mode, "subjects"] }),
  });
}

export function useDeleteSubject(mode: Mode) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${base(mode)}/subjects/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taxonomy", mode, "subjects"] }),
  });
}

export function useCreateTopic(mode: Mode, subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTopicRequest) =>
      (await apiClient.post<TopicResponse>(`${base(mode)}/subjects/${subjectId}/topics`, body)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["taxonomy", mode, "subjects", subjectId, "topics"] }),
  });
}

export function useUpdateTopic(mode: Mode, subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateTopicRequest }) =>
      (await apiClient.patch<TopicResponse>(`${base(mode)}/topics/${id}`, body)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["taxonomy", mode, "subjects", subjectId, "topics"] }),
  });
}

export function useDeleteTopic(mode: Mode, subjectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${base(mode)}/topics/${id}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["taxonomy", mode, "subjects", subjectId, "topics"] }),
  });
}
