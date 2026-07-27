import { cloneElement, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { Drawer, Grid, Popover } from "antd";
import type { TooltipPlacement } from "antd/es/tooltip";

// §8 Sheet: the responsive container — Popover on desktop, bottom Drawer on mobile.
// FilterSheet's split, lifted; FilterSheet itself is not migrated onto it (D12).
// The caller owns both the open state and the trigger element, so Sheet only clones
// the trigger: aria-expanded in both branches, plus the open handler on mobile.
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

  if (isDesktop) {
    // Desktop: antd's controlled Popover commits the new open value before the cloned
    // child's onClick runs, so a functional toggle on the trigger would invert it
    // straight back (net no-op — the sheet reads as stuck closed). onOpenChange owns
    // desktop state, which is why the clone below adds no onClick and callers must not
    // wire one either. Mobile has no such wiring and needs the handler below.
    return (
      <Popover
        open={open}
        onOpenChange={onOpenChange}
        trigger="click"
        placement={desktopPlacement}
        content={children}
      >
        {cloneElement(anchor, { "aria-expanded": open })}
      </Popover>
    );
  }
  return (
    <>
      {cloneElement(anchor, { "aria-expanded": open, onClick: () => onOpenChange(!open) })}
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
