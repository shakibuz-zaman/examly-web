import { useState, type CSSProperties, type ReactNode } from "react";

export type OptionRowProps = {
  optionKey: string; // "ক" | "খ" | ...
  children: ReactNode; // option HTML (QuestionContentView output)
  state: "default" | "selected" | "correct" | "wrong";
  multiple?: boolean; // checkbox vs radio semantics (aria only)
  disabled?: boolean;
  onSelect?: () => void;
};

const STATE_STYLES: Record<OptionRowProps["state"], CSSProperties> = {
  default: { background: "var(--ex-card)", borderColor: "var(--ex-line-strong)" },
  selected: { background: "var(--ex-teal-tint)", borderColor: "var(--ex-teal)" },
  correct: { background: "var(--ex-green-tint)", borderColor: "var(--ex-green)" },
  wrong: { background: "var(--ex-red-tint)", borderColor: "var(--ex-red)" },
};

export function OptionRow({ optionKey, children, state, multiple, disabled, onSelect }: OptionRowProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      role={multiple ? "checkbox" : "radio"}
      aria-checked={state === "selected"}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(e) => {
        if (disabled || !onSelect) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        padding: "10px 14px",
        border: "1.5px solid",
        borderRadius: 12,
        cursor: disabled ? "default" : "pointer",
        fontSize: 16,
        lineHeight: 1.7,
        textAlign: "start",
        transition: "background .15s, border-color .15s",
        outline: focused ? "2px solid var(--ex-teal)" : "none",
        outlineOffset: 2,
        ...STATE_STYLES[state],
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          background: "var(--ex-stage)",
          color: "var(--ex-ink-soft)",
        }}
      >
        {optionKey}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
