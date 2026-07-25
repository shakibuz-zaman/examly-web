import { FONT_STACK, paletteFor, radii, type ThemeMode } from "./tokens";

// Semantic vars for non-antd surfaces (runner, charts, illustrations).
export function applyCssVars(mode: ThemeMode): void {
  const p = paletteFor(mode);
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  // index.html sets an inline html background that outranks the stylesheet after a
  // live toggle — keep the html backdrop in sync so toggling has no stale flash.
  root.style.background = p.bg;
  const map: Record<string, string> = {
    "--ex-font": FONT_STACK,
    "--ex-teal": p.teal, "--ex-teal-hover": p.tealHover, "--ex-teal-active": p.tealActive,
    "--ex-teal-tint": p.tealTint, "--ex-teal-tint-2": p.tealTint2, "--ex-teal-ink": p.tealInk,
    "--ex-bg": p.bg, "--ex-stage": p.stage, "--ex-card": p.card, "--ex-card-2": p.card2,
    "--ex-ink": p.ink, "--ex-ink-soft": p.inkSoft, "--ex-ink-faint": p.inkFaint,
    "--ex-line": p.line, "--ex-line-strong": p.lineStrong,
    "--ex-coral": p.coral, "--ex-coral-tint": p.coralTint,
    "--ex-purple": p.purple, "--ex-purple-tint": p.purpleTint,
    "--ex-amber": p.amber, "--ex-amber-tint": p.amberTint,
    "--ex-green": p.green, "--ex-green-tint": p.greenTint,
    "--ex-red": p.red, "--ex-red-tint": p.redTint,
    "--ex-on-solid": p.onSolid,
    "--ex-band-from": p.bandFrom, "--ex-band-to": p.bandTo,
    "--ex-band-ink": p.bandInk, "--ex-band-ink-soft": p.bandInkSoft,
    "--ex-band-pill": p.bandPill, "--ex-band-pill-hover": p.bandPillHover,
    "--ex-shadow-1": p.shadow1, "--ex-shadow-2": p.shadow2,
    "--ex-radius-card": `${radii.card}px`,
  };
  for (const [k, v] of Object.entries(map)) root.style.setProperty(k, v);
}
