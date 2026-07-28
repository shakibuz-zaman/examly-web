import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { bnNum } from "../lib/bn";
import { PillButton } from "./PillButton";
import { Sheet } from "./Sheet";

// §4 FilterSheet: the trigger + count badge; the responsive Popover/Drawer split now lives
// in Sheet (7d's D12 duplication, closed). Each page supplies its own body, because a
// config-object DSL over "groups of chips" buys nothing that children do not.
//
// The trigger deliberately wires NO onClick and NO aria-expanded: Sheet owns both (it
// clears onClick on desktop, where antd's Popover would invert a caller's toggle).
export function FilterSheet({
  count,
  title = "ফিল্টার",
  children,
}: {
  count: number;
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={title}
      trigger={
        <PillButton variant="outline" size="sm">
          <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
          {title}
          {count > 0 && <span className="ex-filterbadge">{bnNum(count)}</span>}
        </PillButton>
      }
    >
      {children}
    </Sheet>
  );
}
