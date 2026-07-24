import type { ReactNode } from "react";

// Standard content column (spec §3.2: max 1040, gutters 16/24, mobile tab bar
// clearance). `banded` = page renders directly under a HeroBand.
export function PageContainer({ children, banded = false }: { children: ReactNode; banded?: boolean }) {
  return <div className={banded ? "ex-page ex-page--banded" : "ex-page"}>{children}</div>;
}
