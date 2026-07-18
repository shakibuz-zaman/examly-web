import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";

// The examiner shell is meaningless to students — bounce them to their home.
// (platform_admin keeps using the examiner shell for global taxonomy.)
export function StudentRedirect({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "student") {
    return <Navigate to="/student/home" replace />;
  }
  return <>{children}</>;
}
