// Pill-shaped filter chip shared across the student storefront, qbank, and notebook
// filter rows. Class-styled since 7b (.ex-chip in src/ui/ui.css) — selected is the
// §4 dark inverse pill. Props unchanged from the 7a-era inline version.
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
      className={selected ? "ex-chip is-selected" : "ex-chip"}
    >
      {label}
    </button>
  );
}
