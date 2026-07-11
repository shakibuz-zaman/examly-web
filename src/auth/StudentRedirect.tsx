import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";

// The examiner shell is meaningless to students — bounce them to their catalog.
// (platform_admin keeps using the examiner shell for global taxonomy.)
export function StudentRedirect({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "student") {
    return <Navigate to="/student/catalog" replace />;
  }
  return <>{children}</>;
}
