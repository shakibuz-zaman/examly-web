// Single source of truth (spec §1.1). Light values lifted from
// mockups/examly-redesign.html; dark is the hand-tuned warm-charcoal map.
export const palette = {
  teal: "#0E7A6B", tealHover: "#0B6357", tealActive: "#084C43",
  tealTint: "#E4F1EE", tealTint2: "#D3E9E4", tealInk: "#0A5C50",
  bg: "#F4F2EC", stage: "#EDEAE1", card: "#FFFFFF", card2: "#FBFAF6",
  ink: "#1C201D", inkSoft: "#565C56", inkFaint: "#8A908A",
  line: "#E6E3DA", lineStrong: "#D6D2C6",
  // Rail behind a meter fill / an inactive streak bar. NOT --ex-stage (1.20:1 light,
  // 1.07:1 dark on a card): at 0% the fill is zero-width, so the track IS the whole
  // graphic and it vanished. Clears WCAG 1.4.11's 3:1 graphical-object floor on both
  // --ex-card and --ex-card-2. Its own token rather than --ex-ink-faint (same value
  // today) so re-tuning an *ink* can never silently break a *surface*.
  track: "#8A908A", // 3.26:1 on card, 3.12:1 on card-2
  // coral/purple/amber/green double as tint-chip inks: values must hold 4.5:1
  // (WCAG AA, spec §10) against their tints AND against white (ghost button).
  // The ended chip meets AA by using inkSoft, not inkFaint (ui.css).
  coral: "#B8442B", coralTint: "#FBE7E1",
  purple: "#7A52C3", purpleTint: "#EEE7FA",
  amber: "#926119", amberTint: "#F7EBD3",
  green: "#287A4E", greenTint: "#E4F1E8",
  red: "#C0432E", redTint: "#F7E1DC",
  bandFrom: "#0E7A6B", bandTo: "#0B6357",
  bandInk: "#FFFFFF", bandInkSoft: "#D3E9E4",
  bandPill: "rgba(255,255,255,.16)", bandPillHover: "rgba(255,255,255,.09)",
  // On-band CTA/chip surface. NOT bandPill: a 16% white wash sits at 1.35:1 against the
  // gradient, so the pill *shape* fails 1.4.11's 3:1 and its white label lands at 3.87:1 —
  // under AA — at the titlerow's end of the ramp. An opaque surface clears both at either
  // gradient endpoint. Hover is a real state change in both modes, but its direction differs:
  // dark brightens toward white; light recedes toward tint (5.44:1 at the element — measured,
  // still comfortably over AA). Do not read "hover" here as "stronger" unqualified.
  bandCta: "#FFFFFF", bandCtaInk: "#0A5C50", bandCtaHover: "#E4F1EE",
  shadow1: "0 2px 10px rgba(28,32,29,.07)", shadow2: "0 4px 18px rgba(28,32,29,.12)",
  onSolid: "#FFFFFF", // text/glyphs sitting on saturated solid fills (same both modes)
  // The dark half of the onSolid pair, for glyphs on a fill the THEME does not choose — a
  // heat cell interpolates its own background, so the ink is picked per cell by contrast
  // (WeaknessHeatmap.readableText). Pure black rather than `ink` (#1C201D) because the teal
  // ramp has a mid band where neither white nor #1C201D reaches AA: the best achievable is
  // 4.06:1 at errorRate ≈ 85 (light) / 76 (dark), and #060606 is the lightest neutral that
  // still clears 4.5:1 across both ramps. So this is "black" by arithmetic, not by taste;
  // its worst case anywhere on either ramp is 4.60:1. Same value in both modes — the cell
  // fill, not the surface, decides. NOT for chrome: `ink`/`ink-soft` own the theme's text.
  onSolidInk: "#000000",
} as const;

export type Palette = Record<keyof typeof palette, string>;

export const paletteDark: Palette = {
  teal: "#2AA894", tealHover: "#35B9A4", tealActive: "#1E8A78",
  tealTint: "#12332E", tealTint2: "#17423B", tealInk: "#7FD0C2",
  bg: "#151714", stage: "#1B1E1A", card: "#20241F", card2: "#1D211C",
  ink: "#E9E7DF", inkSoft: "#A9AFA7", inkFaint: "#787E76",
  line: "#33372F", lineStrong: "#42463D",
  track: "#787E76", // 3.78:1 on card, 3.92:1 on card-2 — see the light palette's note
  coral: "#E07A5F", coralTint: "#3A241D",
  purple: "#A487E4", purpleTint: "#2C2440", // 5.0:1 on tint (was 4.43)
  amber: "#D89A3D", amberTint: "#3A2F19",
  green: "#4CAF7D", greenTint: "#1D3327",
  // 7g Task 8: was #D96A55, and the number that mattered was not this hex but the one antd
  // derives from it. `antdTheme.ts` seeds `colorError` with this token, and the dark
  // algorithm DARKENS a seed (`generate(seed, {theme:"dark", backgroundColor:"#141414"})[5]`)
  // — #D96A55 came out as #BB5D4B, which is 3.58:1 on --ex-card (#20241F) and therefore under
  // AA for every `<Button danger>`, `<Button type="link" danger>` and `<Typography.Text
  // type="danger">` in the dark examiner shell (T3 measured it on /questions and on the
  // roster). Same hue and saturation (hsl 9.5°, 63.5%), lightness 59.2% → 67%: antd now
  // derives #C17667 = 4.54:1 on the card and 4.75:1 on antd's elevated (modal) surface, which
  // puts danger in line with the other three semantic inks in dark (success 4.47, warning
  // 4.93, primary 4.14). The LIGHT palette is untouched — its derivation is the identity
  // (#C0432E → #C0432E, 5.14:1) so it never had the problem. --ex-red's direct consumers all
  // move the right way on the darker surfaces they sit on: OptionRow's "wrong" border over
  // --ex-red-tint (#3B211C) 4.33:1 → 5.56:1, PracticeRunnerPage's reveal ink on the card
  // (#20241F) 4.61:1 → 5.92:1.
  // Trade recorded in the task report: white-on-solid `danger` (the nine confirm-dialog OK
  // buttons) goes 4.39 → 3.47. No single token can fix both — a colour needs relative
  // luminance ≤0.183 to clear 4.5:1 against white and ≥0.245 to clear it against the card —
  // and white-on-solid is already the theme's standing dark-mode condition (the teal primary
  // sits at 3.81). Changing that one means changing the TEXT colour on solid danger
  // (`components.Button.dangerColor`), which is a design ruling, not an a11y mechanic.
  red: "#E08776", redTint: "#3B211C",
  bandFrom: "#12332E", bandTo: "#17423B",
  bandInk: "#E9E7DF", bandInkSoft: "#7FD0C2",
  bandPill: "rgba(255,255,255,.10)", bandPillHover: "rgba(255,255,255,.06)",
  bandCta: "#E9E7DF", bandCtaInk: "#12332E", bandCtaHover: "#FFFFFF",
  shadow1: "0 0 0 1px #33372F", shadow2: "0 8px 24px rgba(0,0,0,.45)",
  onSolid: "#FFFFFF",
  onSolidInk: "#000000",
};

export const FONT_STACK =
  "'Hind Siliguri', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const radii = { md: 14, sm: 10, lg: 20, card: 18, pill: 999 } as const;
export type ThemeMode = "light" | "dark";
export const paletteFor = (mode: ThemeMode) => (mode === "dark" ? paletteDark : palette);
