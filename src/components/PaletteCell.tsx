import type { CSSProperties } from "react";

export type PaletteCellProps = {
  number: number; // display: Western digits, .tnum
  state: "notVisited" | "visitedUnanswered" | "answered" | "marked";
  answeredWhileMarked?: boolean; // green dot
  current?: boolean; // ring highlight
  onClick?: () => void;
};

const STATE_STYLES: Record<PaletteCellProps["state"], CSSProperties> = {
  notVisited: {
    background: "var(--ex-stage)",
    color: "var(--ex-ink-faint)",
    border: "1px solid var(--ex-line)",
  },
  visitedUnanswered: {
    background: "var(--ex-coral-tint)",
    color: "var(--ex-coral)",
    border: "1px solid var(--ex-coral)",
  },
  answered: {
    background: "var(--ex-green)",
    color: "var(--ex-on-solid)",
    border: "1px solid var(--ex-green)",
  },
  marked: {
    background: "var(--ex-purple)",
    color: "var(--ex-on-solid)",
    border: "1px solid var(--ex-purple)",
  },
};

export function PaletteCell({ number, state, answeredWhileMarked, current, onClick }: PaletteCellProps) {
  return (
    <button
      type="button"
      aria-label={`প্রশ্ন ${number}`}
      aria-current={current || undefined}
      onClick={onClick}
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: 8,
        cursor: onClick ? "pointer" : "default",
        fontFamily: "var(--ex-font)",
        fontSize: 15,
        fontWeight: 600,
        padding: 0,
        boxShadow: current ? "0 0 0 2px var(--ex-teal)" : "none",
        ...STATE_STYLES[state],
      }}
    >
      <span className="tnum">{number}</span>
      {answeredWhileMarked && (
        <span
          style={{
            position: "absolute",
            right: 2,
            bottom: 2,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--ex-green)",
          }}
        />
      )}
    </button>
  );
}
