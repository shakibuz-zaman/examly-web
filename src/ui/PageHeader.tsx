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
      {/* the class is not decoration: it carries the min-width:0 that lets a long title
          wrap instead of shoving the actions column past the right edge */}
      <div className="ex-pagehead-titles">
        <h1 className="ex-pagehead-title">{title}</h1>
        {/* `!= null`, not truthiness: these are ReactNode, and a bare `0` — the summary a
            count-driven caller produces on an empty list — is falsy but perfectly
            renderable. `{0 && …}` renders the naked `0` with no wrapper or styling. */}
        {summary != null && <div className="ex-pagehead-summary">{summary}</div>}
      </div>
      {actions != null && <div className="ex-pagehead-actions">{actions}</div>}
    </div>
  );
}
