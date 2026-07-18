import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { apiClient } from "./client";
import type { CreateOrgRequest, OrgResponse, UpdateOrgRequest } from "./types";

const MY_ORG_KEY = ["me", "org"] as const;
const MY_TRACKS_KEY = ["me", "tracks"] as const;

export type MyTracksResponse = { trackIds: string[] };

export function useMyTracks() {
  return useQuery<MyTracksResponse>({
    queryKey: MY_TRACKS_KEY,
    queryFn: async () =>
      (await apiClient.get<MyTracksResponse>("/api/v1/me/tracks")).data,
  });
}

export function useSaveMyTracks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackIds: string[]) => {
      const { data } = await apiClient.put<MyTracksResponse>("/api/v1/me/tracks", { trackIds });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_TRACKS_KEY }),
  });
}

export function useMyOrg() {
  return useQuery<OrgResponse | null>({
    queryKey: MY_ORG_KEY,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<OrgResponse>("/api/v1/me/org");
        return data;
      } catch (e) {
        if (e instanceof AxiosError && e.response?.status === 404) return null;
        throw e;
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof AxiosError && error.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateMyOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateOrgRequest) => {
      const { data } = await apiClient.post<OrgResponse>("/api/v1/me/org", body);
      return data;
    },
    onSuccess: (data) => qc.setQueryData(MY_ORG_KEY, data),
  });
}

export function useUpdateMyOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateOrgRequest) => {
      const { data } = await apiClient.patch<OrgResponse>("/api/v1/me/org", body);
      return data;
    },
    onSuccess: (data) => qc.setQueryData(MY_ORG_KEY, data),
  });
}
