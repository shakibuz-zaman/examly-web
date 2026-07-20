// Pill-shaped filter chip shared across the student storefront, qbank, and notebook
// filter rows. Extracted from the byte-identical local copies (Task 14 hygiene).
export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        border: "1.5px solid",
        borderRadius: 999,
        padding: "5px 14px",
        fontSize: 14,
        cursor: "pointer",
        background: selected ? "var(--ex-teal-tint)" : "var(--ex-card)",
        borderColor: selected ? "var(--ex-teal)" : "var(--ex-line-strong)",
        color: selected ? "var(--ex-teal-ink)" : "var(--ex-ink)",
        fontWeight: selected ? 600 : 400,
        transition: "background .15s, border-color .15s",
      }}
    >
      {label}
    </button>
  );
}
