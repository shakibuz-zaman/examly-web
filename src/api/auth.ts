// src/api/auth.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { apiClient } from "./client";

// ---- Wire types (mirror Examly.Api Features/Identity/IdentityDtos.cs, camelCase) ----

export type MeUser = {
  sub: string;
  phone: string; // E.164 "+8801…" ("" only for a legacy doc with no phone)
  email: string | null;
  emailVerified: boolean;
  name: string;
  role: "student" | "examiner" | "platform_admin";
  orgId: string | null;
  hasPassword: boolean;
  googleLinked: boolean;
  createdAt: string;
};

export type TokenResponse = { accessToken: string; expiresAt: string; user: MeUser };
export type NeedsName = { needsName: true };
export type VerifyOutcome = TokenResponse | NeedsName;
export type SessionInfo = {
  sid: string;
  device: string; // one of "Android" | "iOS" | "Windows" | "Mac" | "Browser"
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export const ME_KEY = ["auth", "me"] as const;

export function isNeedsName(r: VerifyOutcome): r is NeedsName {
  return "needsName" in r;
}

// Identity endpoints answer errors as `{message}` (Bengali) — a different envelope from the
// `{error}` used by commerce and the ProblemDetails used by validators.
export function identityError(e: unknown, fallback: string): string {
  if (e instanceof AxiosError) {
    const m = (e.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

// ---- Anonymous login calls (the flows drive these imperatively) ----

export async function sendOtp(phone: string): Promise<string> {
  const { data } = await apiClient.post<{ message: string }>("/api/v1/auth/otp/send", { phone });
  return data.message;
}

export async function verifyOtp(phone: string, code: string, name?: string): Promise<VerifyOutcome> {
  const { data } = await apiClient.post<VerifyOutcome>("/api/v1/auth/otp/verify", {
    phone,
    code,
    name: name ?? null,
  });
  return data;
}

export async function passwordLogin(phone: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/login/password", {
    phone,
    password,
  });
  return data;
}

export async function fetchMe(): Promise<MeUser> {
  const { data } = await apiClient.get<MeUser>("/api/v1/auth/me");
  return data;
}

// AllowAnonymous + idempotent on the API: revokes the cookie's session family and clears the
// cookie. Best-effort by design — a network failure must never block the local logout.
export async function logoutServer(): Promise<void> {
  await apiClient.post("/api/v1/auth/logout", null).catch(() => undefined);
}

// ---- Google handshake ----

export function googleStartUrl(returnTo: string): string {
  return `/api/v1/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function googleLogin(ticket: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/google/login", { ticket });
  return data;
}

export async function googleComplete(
  ticket: string,
  phone: string,
  code: string,
  name?: string,
): Promise<VerifyOutcome> {
  const { data } = await apiClient.post<VerifyOutcome>("/api/v1/auth/google/complete", {
    ticket,
    phone,
    code,
    name: name ?? null,
  });
  return data;
}

export async function googleLink(ticket: string): Promise<void> {
  await apiClient.post("/api/v1/auth/google/link", { ticket });
}

export function useProviders() {
  return useQuery<string[]>({
    queryKey: ["auth", "providers"],
    staleTime: Infinity, // config-gated on the server; changes only with an API restart
    queryFn: async () => (await apiClient.get<string[]>("/api/v1/auth/providers")).data,
  });
}

// ---- Account management (bearer) ----

export function useSessions() {
  return useQuery<SessionInfo[]>({
    queryKey: ["auth", "sessions"],
    queryFn: async () => (await apiClient.get<SessionInfo[]>("/api/v1/auth/sessions")).data,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sid: string) => {
      await apiClient.delete(`/api/v1/auth/sessions/${sid}`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["auth", "sessions"] }),
  });
}

export function useLogoutAll() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/v1/auth/logout-all", null);
    },
  });
}

export function useUpdateName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.patch<MeUser>("/api/v1/auth/me", { name })).data,
    onSuccess: (me) => qc.setQueryData(ME_KEY, me),
  });
}

export function useSetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { currentPassword: string | null; newPassword: string }) =>
      (await apiClient.post<TokenResponse>("/api/v1/auth/password", body)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["auth", "sessions"] }),
  });
}

export function useRemovePassword() {
  return useMutation({
    // DELETE with a body: axios sends it via `data`.
    mutationFn: async (currentPassword: string) => {
      await apiClient.delete("/api/v1/auth/password", { data: { currentPassword } });
    },
  });
}

export function usePhoneChange() {
  return useMutation({
    mutationFn: async (newPhone: string) =>
      (await apiClient.post<{ message: string }>("/api/v1/auth/phone/change", { newPhone })).data
        .message,
  });
}

export function usePhoneChangeVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { newPhone: string; code: string }) =>
      (await apiClient.post<TokenResponse>("/api/v1/auth/phone/change/verify", body)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["auth", "sessions"] }),
  });
}

export function useEmailChange() {
  return useMutation({
    mutationFn: async (newEmail: string) =>
      (await apiClient.post<{ message: string }>("/api/v1/auth/email/change", { newEmail })).data
        .message,
  });
}

export async function emailChangeVerify(token: string): Promise<string> {
  const { data } = await apiClient.post<{ message: string }>("/api/v1/auth/email/change/verify", {
    token,
  });
  return data.message;
}

export function useGoogleUnlink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete("/api/v1/auth/google");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ME_KEY }),
  });
}
