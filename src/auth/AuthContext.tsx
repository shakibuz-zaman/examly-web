import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { activeTrackStore } from "../features/tracks/activeTrackStore";
import { tokenStore } from "./tokenStore";
import { refreshAccessToken, registerUnauthorizedHandler } from "../api/client";
import { ME_KEY, fetchMe, logoutServer } from "../api/auth";
import type { MeUser, TokenResponse } from "../api/auth";

export type AuthContextValue = {
  token: string | null;
  user: MeUser | null;
  isPending: boolean;
  setToken: (token: string) => void;
  adoptSession: (t: TokenResponse) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(() => tokenStore.get());
  // sessionStorage dies with the tab; the 30-day examly.rt cookie is the only cross-restart
  // memory the design has. One silent refresh on a token-less boot redeems it (single attempt
  // — a logged-out visitor costs exactly one 401 that also clears any dead cookie).
  const [booting, setBooting] = useState(() => tokenStore.get() == null);

  useEffect(() => {
    if (!booting) return;
    let alive = true;
    void refreshAccessToken()
      .then((t) => {
        if (!alive) return;
        if (t) setTokenState(t);
        setBooting(false);
      })
      .catch(() => {
        if (alive) setBooting(false);
      });
    return () => {
      alive = false;
    };
  }, [booting]);

  // user IS the /auth/me answer (role/orgId are resolved server-side per request — a token
  // never names its own role, so decoding the JWT is gone for good).
  const me = useQuery<MeUser>({
    queryKey: ME_KEY,
    queryFn: fetchMe,
    enabled: token != null,
    staleTime: 60_000,
  });

  // A refresh against the browser-wide cookie can swap identities WITHOUT passing through
  // setToken (account B logs in from another tab while this tab holds account A). Same
  // shared-key leak as the auth edges — on a sub transition, drop the outgoing identity's
  // cache. The ref resets when user goes null, so a normal logout→login pair (already
  // cleared by setToken) doesn't clear twice.
  const lastSubRef = useRef<string | null>(null);
  useEffect(() => {
    const sub = me.data?.sub ?? null;
    if (sub == null) {
      lastSubRef.current = null;
      return;
    }
    if (lastSubRef.current != null && lastSubRef.current !== sub) {
      const fresh = me.data;
      queryClient.clear();
      activeTrackStore.clear();
      queryClient.setQueryData(ME_KEY, fresh); // keep the incoming identity; consumers refetch under it
    }
    lastSubRef.current = sub;
  }, [me.data, queryClient]);

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
    (next: string) => {
      clearSessionState();
      tokenStore.set(next);
      setTokenState(next);
    },
    [clearSessionState],
  );

  // Same identity, new session: /auth/password and /auth/phone/change/verify re-mint the
  // session (new cookie + token) and the OLD token dies on its next sst check — the swap must
  // be immediate. No cache clear: same person, and t.user is projected straight off the users
  // doc, so seed then invalidate — GET /auth/me stays authoritative (admin allowlist drift).
  const adoptSession = useCallback(
    (t: TokenResponse) => {
      tokenStore.set(t.accessToken);
      setTokenState(t.accessToken);
      queryClient.setQueryData(ME_KEY, t.user);
      void queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
    [queryClient],
  );

  // Measured on @tanstack/react-query 5.100.10: clear() empties the cache but does NOT
  // re-render or refetch. What keeps the outgoing student's rows off screen is that both
  // edges unmount the student tree immediately after. An in-place account switch, or a
  // silent setToken refresh that keeps the tree mounted, would need an explicit remount.
  const logout = useCallback(() => {
    void logoutServer(); // best effort: revokes the family, clears the cookie; never blocks
    tokenStore.clear();
    clearSessionState();
    setTokenState(null);
  }, [clearSessionState]);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: token != null ? (me.data ?? null) : null,
      isPending: booting || (token != null && me.isPending),
      setToken,
      adoptSession,
      logout,
    }),
    [token, me.data, me.isPending, booting, setToken, adoptSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
