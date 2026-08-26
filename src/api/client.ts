import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "../auth/tokenStore";
import { env } from "../lib/env";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

// Bare instance: no interceptors, so the refresh POST can never recurse through the 401
// handler below, and it carries no bearer (the examly.rt cookie IS the credential — the
// browser attaches it automatically on this same-origin, /api/v1/auth-scoped request).
const refreshClient = axios.create({ baseURL: env.apiBaseUrl });

let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const { data } = await refreshClient.post<{ accessToken: string; expiresAt: string }>(
      "/api/v1/auth/refresh",
      null,
    );
    tokenStore.set(data.accessToken);
    return data.accessToken;
  } catch (e) {
    // 401 = the cookie is genuinely dead (the API clears it in that same response).
    if (e instanceof AxiosError && e.response?.status === 401) return null;
    // Anything else (network, 5xx, 429) is transient: rethrow so callers keep the
    // session — treating it as dead used to trigger logout(), which REVOKED a
    // healthy family server-side over a hiccup.
    throw e;
  }
}

// SINGLE-FLIGHT, and cross-tab serialized where the browser supports it. Refresh rotation is
// zero-leeway on the API: two concurrent refreshes present the same cookie twice, and the
// second one revokes the whole session family (= logs the user out on every device). One
// in-flight promise covers this tab; navigator.locks covers sibling tabs sharing the cookie.
export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("examly.refresh", doRefresh)
      : doRefresh()
  ).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (error.response?.status !== 401 || !config) throw error;

    // A 401 that carries `{message}` is a CREDENTIAL answer (wrong OTP/password/expired code —
    // otp/verify, login/password, phone/change/verify, google/complete). Surface it to the
    // caller untouched; refreshing on it would be wrong and could burn the session.
    const data = error.response.data as { message?: unknown } | undefined;
    if (data && typeof data.message === "string") throw error;

    // Empty-body 401 = dead/stale access token. One refresh, one retry, then hard logout.
    if (!tokenStore.get() || config._retried) {
      tokenStore.clear();
      onUnauthorized?.();
      throw error;
    }
    let token: string | null;
    try {
      token = await refreshAccessToken();
    } catch {
      throw error; // transient refresh failure: keep the token, the caller just fails this once
    }
    if (!token) {
      tokenStore.clear();
      onUnauthorized?.();
      throw error;
    }
    config._retried = true;
    return apiClient(config); // request interceptor re-reads tokenStore → new bearer
  },
);
