import { apiClient } from "./client";
import { env } from "../lib/env";
import type { MediaItemResponse } from "./types";

export async function uploadMedia(file: File): Promise<MediaItemResponse> {
  const form = new FormData();
  form.append("file", file);
  // Content-Type: null removes apiClient's default application/json so the browser
  // sets multipart/form-data WITH its boundary. An explicit "multipart/form-data"
  // string is forwarded boundary-less by axios's xhr adapter and rejected (400).
  const { data } = await apiClient.post<MediaItemResponse>("/api/v1/media", form, {
    headers: { "Content-Type": null },
  });
  return data;
}

export function mediaUrl(id: string): string {
  const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
  return `${base}/api/v1/media/${id}`;
}
