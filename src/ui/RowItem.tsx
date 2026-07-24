import type { ReactNode } from "react";

// §4 dense row: lead glyph circle, title+meta, trailing action.
export function RowItem({
  lead,
  title,
  meta,
  trailing,
  onClick,
}: {
  lead?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={onClick ? "ex-rowitem ex-rowitem--click" : "ex-rowitem"}
      onClick={onClick}
    >
      {lead && <span className="ex-rowitem-lead">{lead}</span>}
      <div className="ex-rowitem-main">
        <div className="ex-rowitem-title">{title}</div>
        {meta && <div className="ex-rowitem-meta">{meta}</div>}
      </div>
      {trailing && <span className="ex-rowitem-trailing">{trailing}</span>}
    </div>
  );
}
