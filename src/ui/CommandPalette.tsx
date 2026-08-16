import { useEffect, useMemo, useRef, useState } from "react";
import { Input, Modal } from "antd";
import type { InputRef } from "antd";
import { CornerDownLeft, Plus, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { EXAMINER_NAV, PALETTE_ACTIONS, isVisibleToRole } from "./examinerNav";

// D5: navigation-only ⌘K. Every row is a route we already have; nothing here fetches.
// Stays inside the antd boundary (§10) — Modal + Input are antd, the rows are house DOM.

type PaletteEntry = { to: string; label: string; Icon: LucideIcon };

// aria-activedescendant needs an id that survives re-filtering, so it is derived from the
// route (unique across the visible set) rather than from the filtered-list index — an
// index-keyed id would point at a different row after every keystroke.
const optionId = (to: string) => `ex-cmdk-opt-${to.replace(/[^a-zA-Z0-9]+/g, "-")}`;
const LIST_ID = "ex-cmdk-list";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<InputRef>(null);
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      closable={false}
      // The body owns all palette state, so destroying it on hide is what resets the query
      // and the cursor for the next ⌘K — there is no reset effect to keep in sync.
      destroyOnHidden
      width={520}
      style={{ top: 88 }}
      // `container` is v6's name for the modal panel (.ant-modal-container); zeroing its
      // padding here beats a `.ant-*` override in ui.css, which the house style avoids.
      styles={{ body: { padding: 0 }, container: { padding: 0, overflow: "hidden" } }}
      // rc-dialog focuses the dialog panel itself when it opens, which lands after the
      // input's autoFocus; re-focusing once the open animation settles is what actually
      // leaves the caret in the box.
      afterOpenChange={(isOpen) => {
        if (isOpen) inputRef.current?.focus();
      }}
    >
      <PaletteBody inputRef={inputRef} onClose={onClose} />
    </Modal>
  );
}

function PaletteBody({
  inputRef,
  onClose,
}: {
  inputRef: React.RefObject<InputRef | null>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "";
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  // isVisibleToRole is the sidebar's own rule, and BOTH halves go through it — the create
  // actions are examiner-only, so an admin must not be offered them either.
  const entries = useMemo<PaletteEntry[]>(
    () => [
      ...EXAMINER_NAV.filter((g) => isVisibleToRole(g, role)).flatMap((g) =>
        g.items.map((i) => ({ to: i.to, label: i.label, Icon: i.Icon })),
      ),
      ...PALETTE_ACTIONS.filter((a) => isVisibleToRole(a, role)).map((a) => ({
        to: a.to,
        label: a.label,
        Icon: Plus,
      })),
    ],
    [role],
  );

  // Substring over label AND path: examiners type Bengali, but "/exams" also has to work
  // for anyone who navigates by URL. toLowerCase is a no-op on Bengali and matters for the
  // Latin paths only.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.label.toLowerCase().includes(q) || e.to.toLowerCase().includes(q),
    );
  }, [entries, query]);

  // Clamp at render rather than trusting the stored cursor: typing can shrink the list
  // under a cursor that was legal a keystroke ago, and an out-of-range activeIndex would
  // point aria-activedescendant at an id that is no longer in the DOM. -1 == empty list.
  const active = results.length === 0 ? -1 : Math.min(cursor, results.length - 1);

  // The full list already overflows the 320px scroller, so arrowing down (or wrapping from
  // the last row back to the first) can park the highlight out of sight. `nearest` scrolls
  // the list and nothing else when the row is already visible.
  useEffect(() => {
    if (active < 0) return;
    document.getElementById(optionId(results[active].to))?.scrollIntoView({ block: "nearest" });
  }, [active, results]);

  const go = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    // Close first, then navigate. Focus falls to the body rather than back to the ⌘K button
    // (antd restores it to the trigger, which unmounts with the route change) — acceptable
    // for a navigation palette, and the destination page's own heading is next in order.
    onClose();
    navigate(entry.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      setCursor(active + 1 >= results.length ? 0 : active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      setCursor(active <= 0 ? results.length - 1 : active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Enter on an empty result set is a no-op — go() guards on undefined.
      go(results[active]);
    }
    // Esc is left to the Modal's own keyboard handler (it bubbles out of the input).
  };

  return (
    <div className="ex-cmdk">
      <div className="ex-cmdk-head">
        <Input
          ref={inputRef}
          autoFocus
          variant="borderless"
          size="large"
          value={query}
          placeholder="পেজ বা কাজ খুঁজুন…"
          aria-label="পেজ বা কাজ খুঁজুন"
          role="combobox"
          aria-expanded
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(results[active].to) : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="ex-cmdk-list" id={LIST_ID} role="listbox" aria-label="ফলাফল">
        {results.map((entry, i) => (
          // Composite widget: the input keeps focus and drives the selection, so the rows
          // are options rather than buttons and carry no tabIndex of their own.
          <div
            key={entry.to}
            id={optionId(entry.to)}
            role="option"
            aria-selected={i === active}
            className={`ex-cmdk-row${i === active ? " is-active" : ""}`}
            onMouseMove={() => setCursor(i)}
            onClick={() => go(entry)}
          >
            <entry.Icon size={15} strokeWidth={1.75} aria-hidden />
            <span className="ex-cmdk-label">{entry.label}</span>
            <span className="ex-cmdk-path" aria-hidden>
              {entry.to}
            </span>
            {i === active ? <CornerDownLeft size={13} strokeWidth={1.75} aria-hidden /> : null}
          </div>
        ))}
      </div>
      {results.length === 0 ? <div className="ex-cmdk-empty">কিছু পাওয়া যায়নি</div> : null}
    </div>
  );
}
