import type { ReactNode } from "react";

// §9: title + summary left, actions right, ONE primary pill per page.
export function PageHeader({
  title,
  summary,
  actions,
}: {
  title: string;
  summary?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ex-pagehead">
      <div>
        <h1 className="ex-pagehead-title">{title}</h1>
        {summary && <div className="ex-pagehead-summary">{summary}</div>}
      </div>
      {actions && <div className="ex-pagehead-actions">{actions}</div>}
    </div>
  );
}
