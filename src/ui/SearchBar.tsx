import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { setSearchTargetPresent } from "./bandSentinel";

// The id the compact app bar's search shortcut focuses (AppHeader, plan 7b Task 10).
const COMPACT_FOCUS_ID = "ex-page-search";

// Floating level-2 search (§4). Debounces 300ms into onSearch; `/` focuses when
// hotkey is on (skipped while another input has focus). id is the compact bar's
// focus target (AppHeader, Task 10 of plan 7b).
export function SearchBar({
  placeholder,
  onSearch,
  id = COMPACT_FOCUS_ID,
  hotkey = true,
}: {
  placeholder: string;
  onSearch: (q: string) => void;
  id?: string;
  hotkey?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const onSearchRef = useRef(onSearch);
  // Latest-ref sync in an effect (not during render) so the debounce below never
  // re-arms when the parent passes a fresh onSearch identity.
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    const t = window.setTimeout(() => onSearchRef.current(value.trim()), 300);
    return () => window.clearTimeout(t);
  }, [value]);

  // Tell the app bar a focus target exists, so the compact bar only shows its
  // search shortcut while this input is actually mounted (e.g. not on the
  // "আমার পরীক্ষা" tab, which renders no SearchBar).
  useEffect(() => {
    if (id !== COMPACT_FOCUS_ID) return;
    setSearchTargetPresent(true);
    return () => setSearchTargetPresent(false);
  }, [id]);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey]);

  return (
    <div className="ex-searchbar">
      <Search size={18} strokeWidth={1.75} aria-hidden />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="ex-searchbar-clear"
          aria-label="সার্চ মুছুন"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
        >
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </div>
  );
}
