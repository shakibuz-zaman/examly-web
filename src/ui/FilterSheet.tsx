import { useState } from "react";
import { Drawer, Grid, Popover } from "antd";
import { SlidersHorizontal } from "lucide-react";
import { Chip } from "../components/Chip";
import { PillButton } from "./PillButton";

export type StoreFilters = {
  type: "all" | "exam" | "model_test";
  price: "all" | "free" | "paid";
  liveOnly: boolean;
};

// eslint-disable-next-line react-refresh/only-export-components -- house pattern (see theme/ThemeContext.tsx)
export const DEFAULT_STORE_FILTERS: StoreFilters = { type: "all", price: "all", liveOnly: false };

// eslint-disable-next-line react-refresh/only-export-components -- house pattern (see theme/ThemeContext.tsx)
export function activeFilterCount(v: StoreFilters): number {
  return (v.type !== "all" ? 1 : 0) + (v.price !== "all" ? 1 : 0) + (v.liveOnly ? 1 : 0);
}

function SheetBody({ value, onChange }: { value: StoreFilters; onChange: (v: StoreFilters) => void }) {
  return (
    <div style={{ minWidth: 240 }}>
      <div className="ex-sheet-group">
        <div className="ex-sheet-label">ধরন</div>
        <div className="ex-sheet-row">
          <Chip label="সব" selected={value.type === "all"} onClick={() => onChange({ ...value, type: "all" })} />
          <Chip label="মডেল টেস্ট" selected={value.type === "model_test"} onClick={() => onChange({ ...value, type: "model_test" })} />
          <Chip label="একক পরীক্ষা" selected={value.type === "exam"} onClick={() => onChange({ ...value, type: "exam" })} />
        </div>
      </div>
      <div className="ex-sheet-group">
        <div className="ex-sheet-label">মূল্য</div>
        <div className="ex-sheet-row">
          <Chip label="সব" selected={value.price === "all"} onClick={() => onChange({ ...value, price: "all" })} />
          <Chip label="ফ্রি" selected={value.price === "free"} onClick={() => onChange({ ...value, price: "free" })} />
          <Chip label="পেইড" selected={value.price === "paid"} onClick={() => onChange({ ...value, price: "paid" })} />
        </div>
      </div>
      <div className="ex-sheet-group">
        <div className="ex-sheet-label">লাইভ</div>
        <div className="ex-sheet-row">
          <Chip label="শুধু লাইভ" selected={value.liveOnly} onClick={() => onChange({ ...value, liveOnly: !value.liveOnly })} />
        </div>
      </div>
    </div>
  );
}

// §4 FilterSheet: bottom Drawer on mobile, Popover on desktop; trigger shows a count badge.
export function FilterSheet({ value, onChange }: { value: StoreFilters; onChange: (v: StoreFilters) => void }) {
  const [open, setOpen] = useState(false);
  const isDesktop = Grid.useBreakpoint().md;
  const count = activeFilterCount(value);

  // Desktop: antd's controlled Popover commits the new open value before the cloned
  // child's onClick runs, so a functional toggle here would invert it straight back
  // (net no-op). Let onOpenChange own desktop state; mobile has no such wiring and
  // needs the handler to open the Drawer.
  const trigger = (
    <PillButton
      variant="outline"
      size="sm"
      onClick={isDesktop ? undefined : () => setOpen((o) => !o)}
      aria-expanded={open}
    >
      <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
      ফিল্টার
      {count > 0 && <span className="ex-filterbadge">{count}</span>}
    </PillButton>
  );

  if (isDesktop) {
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomRight"
        content={<SheetBody value={value} onChange={onChange} />}
      >
        {trigger}
      </Popover>
    );
  }
  return (
    <>
      {trigger}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom"
        height="auto"
        title="ফিল্টার"
      >
        <SheetBody value={value} onChange={onChange} />
      </Drawer>
    </>
  );
}
