import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { activeTrackStore } from "../features/tracks/activeTrackStore";
import { tokenStore } from "./tokenStore";
import { registerUnauthorizedHandler } from "../api/client";

export type DecodedClaims = {
  sub: string;
  email?: string;
  name?: string;
  role: string;
  orgId?: string;
  exp: number;
};

type AuthState = {
  token: string | null;
  user: DecodedClaims | null;
};

export type AuthContextValue = AuthState & {
  setToken: (token: string) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): DecodedClaims | null {
  try {
    const [, payload] = token.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    // atob alone mangles multi-byte UTF-8 (Bangla names) — decode bytes explicitly.
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const json = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(json) as DecodedClaims;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(() => {
    const token = tokenStore.get();
    return { token, user: token ? decodeJwt(token) : null };
  });

  // The QueryClient is module-scoped (ThemedApp) and no query key carries a student
  // segment — two students on the same track share byte-identical keys. So every identity
  // change must drop the cache, or the incoming session renders the outgoing one's data
  // from cache while its own refetch is still in flight (verified: re-seeding the old rows
  // under the identical key after a switch reproduces the leak in full). BOTH edges need
  // it — /login has no auth guard, so signing in as someone else never reaches logout.
  const clearSessionState = useCallback(() => {
    queryClient.clear();
    activeTrackStore.clear();
  }, [queryClient]);

  const setToken = useCallback(
    (token: string) => {
      clearSessionState();
      tokenStore.set(token);
      setState({ token, user: decodeJwt(token) });
    },
    [clearSessionState],
  );

  // Measured on @tanstack/react-query 5.100.10: clear() empties the cache but does NOT
  // re-render or refetch. What keeps the outgoing student's rows off screen is that both
  // edges unmount the student tree immediately after. An in-place account switch, or a
  // silent setToken refresh that keeps the tree mounted, would need an explicit remount.
  const logout = useCallback(() => {
    tokenStore.clear();
    clearSessionState();
    setState({ token: null, user: null });
  }, [clearSessionState]);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, setToken, logout }),
    [state, setToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
