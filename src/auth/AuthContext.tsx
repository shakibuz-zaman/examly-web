import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  const [state, setState] = useState<AuthState>(() => {
    const token = tokenStore.get();
    return { token, user: token ? decodeJwt(token) : null };
  });

  const setToken = useCallback((token: string) => {
    tokenStore.set(token);
    setState({ token, user: decodeJwt(token) });
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setState({ token: null, user: null });
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, setToken, logout }),
    [state, setToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
