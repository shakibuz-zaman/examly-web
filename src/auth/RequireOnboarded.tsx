import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { useMyOrg } from "../api/me";

export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const isExaminer = user?.role === "examiner";
  const { data, isLoading } = useMyOrg();

  if (!isExaminer) return <>{children}</>;
  if (isLoading) return <Spin style={{ display: "block", marginTop: 80 }} />;
  if (!data && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
