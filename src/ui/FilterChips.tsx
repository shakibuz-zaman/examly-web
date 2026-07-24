import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Chip } from "../components/Chip";

export type FilterChipItem = {
  key: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  removable?: boolean; // ✕-chip echoing an active sheet filter — onClick removes it
};

// Single scrollable row, hidden scrollbar (.ex-scroll-x from 7a). Removable chips
// render selected-style with a trailing ✕ glyph.
export function FilterChips({ items, trailing }: { items: FilterChipItem[]; trailing?: ReactNode }) {
  return (
    <div className="ex-scroll-x" role="group" aria-label="ফিল্টার">
      {items.map((item) =>
        item.removable ? (
          <button
            key={item.key}
            type="button"
            className="ex-chip is-selected"
            onClick={item.onClick}
            aria-label={`${item.label} ফিল্টার সরান`}
          >
            {item.label}
            <X size={14} strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <Chip key={item.key} label={item.label} selected={item.selected} onClick={item.onClick} />
        ),
      )}
      {trailing}
    </div>
  );
}
