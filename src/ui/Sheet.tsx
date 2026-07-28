import { cloneElement, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { Drawer, Grid, Popover } from "antd";
import type { TooltipPlacement } from "antd/es/tooltip";

// §8 Sheet: the responsive container — Popover on desktop, bottom Drawer on mobile.
// FilterSheet's split, lifted; FilterSheet migrated onto it in 7e, closing D12's duplication.
// The caller owns the open state and supplies the trigger element, but Sheet owns the
// trigger's onClick on both branches — the open handler on mobile, cleared on desktop.
// Trigger side effects belong in onOpenChange; an onClick on the trigger is dropped.
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  desktopPlacement = "bottomRight",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  title: string;
  children: ReactNode;
  desktopPlacement?: TooltipPlacement;
}) {
  const isDesktop = Grid.useBreakpoint().md;
  // The prop stays a plain ReactElement so any anchor can be passed; cloneElement
  // needs a prop shape that admits aria-expanded/onClick to type the clone.
  const anchor = trigger as ReactElement<HTMLAttributes<HTMLElement>>;
  // aria-expanded alone says the trigger toggles something, not that the something is a
  // separate popup surface. "dialog" over "menu"/"listbox" on both branches: what opens
  // is a titled container of ordinary controls — no menu keyboard model to honour — and
  // the value must match on desktop and mobile or the same button announces two things.
  // True on BOTH branches since 7e. Mobile: antd's Drawer renders role="dialog" itself.
  // Desktop: the promise was ASPIRATIONAL — antd's Popover renders a plain div — until 7e
  // brought the first desktop caller; the content now declares the role, with aria-modal
  // "false" as the honest value for a surface that does not trap focus (see below).
  const popupHint = { "aria-haspopup": "dialog", "aria-expanded": open } as const;

  if (isDesktop) {
    // Desktop: antd's Popover (via @rc-component/trigger) commits the new open value and
    // only then calls the cloned child's own onClick, so a caller's toggle would invert it
    // straight back (net no-op — the sheet reads as stuck closed). onOpenChange owns
    // desktop state, so the clone *clears* onClick rather than trusting callers not to
    // wire one; React 19's cloneElement writes the undefined through, and the Popover's
    // own click handling is untouched. Mobile drops it too, supplying its own below.
    return (
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        trigger="click"
        placement={desktopPlacement}
        // The trigger announces a dialog on both branches; antd's Popover renders a plain
        // div, so the promise only becomes true here. aria-modal is FALSE deliberately:
        // Popover has no focus trap, and claiming a modal that does not trap focus strands
        // a screen-reader user worse than not claiming one.
        content={<div role="dialog" aria-modal="false" aria-label={title}>{children}</div>}
      >
        {cloneElement(anchor, { ...popupHint, onClick: undefined })}
      </Popover>
    );
  }
  return (
    <>
      {cloneElement(anchor, { ...popupHint, onClick: () => onOpenChange(!open) })}
      <Drawer
        open={open}
        onClose={() => onOpenChange(false)}
        placement="bottom"
        // antd 6 deprecated `height`/`width` in favour of `size`. `size` takes the
        // "default"/"large" presets, a number, OR any other CSS length string — a
        // non-numeric string is forwarded verbatim as the wrapper's height, so
        // "auto" keeps the content-sized bottom sheet without the console warning.
        size="auto"
        title={title}
      >
        {children}
      </Drawer>
    </>
  );
}
