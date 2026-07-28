import { Chip } from "../../components/Chip";

// §4 স্টোর filter state + sheet body. It lives with the page rather than in ui/ because
// ui/FilterSheet.tsx is now generic (trigger + count badge + responsive container) and a
// shared primitive has no business knowing about ধরন/মূল্য/লাইভ. Moved here from
// ui/FilterSheet.tsx in 7e, unchanged apart from the component's name.
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

export function StoreFilterSheetBody({ value, onChange }: { value: StoreFilters; onChange: (v: StoreFilters) => void }) {
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
