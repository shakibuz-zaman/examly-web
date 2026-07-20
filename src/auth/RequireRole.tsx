import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";

// Client-side role gate for routes that already sit behind RequireAuth but must be
// restricted to a single role (e.g. platform_admin admin pages). A wrong role — an
// examiner or student who typed an /admin URL — is bounced home rather than shown the
// page. This is defence-in-depth only; the API still enforces the role server-side.
export function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
