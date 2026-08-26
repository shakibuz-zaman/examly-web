import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";

export function RequireAuth({ children, role }: { children: ReactNode; role?: string }) {
  const { user, isPending } = useAuth();
  const location = useLocation();

  // user is async now (boot refresh, then /auth/me) — don't bounce to /login mid-flight.
  if (isPending) return <Spin style={{ display: "block", marginTop: 80 }} />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
