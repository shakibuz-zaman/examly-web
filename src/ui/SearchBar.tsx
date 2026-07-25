import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { acquireSearchTargetClaim } from "./bandSentinel";

// The id the compact app bar's search shortcut focuses (AppHeader, plan 7b Task 10).
const COMPACT_FOCUS_ID = "ex-page-search";

// Floating level-2 search (§4). Debounces 300ms into onSearch; `/` focuses when
// hotkey is on (skipped while another input has focus). id is the compact bar's
// focus target (AppHeader, Task 10 of plan 7b). defaultValue seeds the box on
// mount (remount after a tab switch restores the parent's query); the mount
// debounce re-emits it, which is a no-op against the parent's matching state.
export function SearchBar({
  placeholder,
  onSearch,
  id = COMPACT_FOCUS_ID,
  hotkey = true,
  defaultValue = "",
}: {
  placeholder: string;
  onSearch: (q: string) => void;
  id?: string;
  hotkey?: boolean;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const onSearchRef = useRef(onSearch);
  // Latest-ref sync in an effect (not during render) so the debounce below never
  // re-arms when the parent passes a fresh onSearch identity.
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  // Seeded with the mount value so the mount run emits nothing: onSearch handlers
  // carry side effects beyond setting q (they re-collapse শেষ), and an emit 300ms
  // after every remount (tab switch, reset nonce) would fire those for a no-op.
  const lastEmitted = useRef(defaultValue.trim());
  useEffect(() => {
    const next = value.trim();
    if (next === lastEmitted.current) return;
    const t = window.setTimeout(() => {
      lastEmitted.current = next;
      onSearchRef.current(next);
    }, 300);
    return () => window.clearTimeout(t);
  }, [value]);

  // Tell the app bar a focus target exists, so the compact bar only shows its
  // search shortcut while a default-id SearchBar is actually mounted.
  useEffect(() => {
    if (id !== COMPACT_FOCUS_ID) return;
    const claim = acquireSearchTargetClaim();
    return () => claim.release();
  }, [id]);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      // Bare `/` only: modifier combos and IME composition stay with the browser,
      // and defaultPrevented means another mounted SearchBar already claimed the
      // press (single-focus guarantee once qbank adds a second instance).
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
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
