// Single source of truth (spec §1.1). Light values lifted from
// mockups/examly-redesign.html; dark is the hand-tuned warm-charcoal map.
export const palette = {
  teal: "#0E7A6B", tealHover: "#0B6357", tealActive: "#084C43",
  tealTint: "#E4F1EE", tealTint2: "#D3E9E4", tealInk: "#0A5C50",
  bg: "#F4F2EC", stage: "#EDEAE1", card: "#FFFFFF", card2: "#FBFAF6",
  ink: "#1C201D", inkSoft: "#565C56", inkFaint: "#8A908A",
  line: "#E6E3DA", lineStrong: "#D6D2C6",
  coral: "#D2593F", coralTint: "#FBE7E1",
  purple: "#7B54C4", purpleTint: "#EEE7FA",
  amber: "#B7791F", amberTint: "#F7EBD3",
  green: "#2F8F5B", greenTint: "#E4F1E8",
  red: "#C0432E", redTint: "#F7E1DC",
  bandFrom: "#0E7A6B", bandTo: "#0B6357",
  bandInk: "#FFFFFF", bandInkSoft: "#D3E9E4",
  bandPill: "rgba(255,255,255,.16)", bandPillHover: "rgba(255,255,255,.09)",
  shadow1: "0 2px 10px rgba(28,32,29,.07)", shadow2: "0 4px 18px rgba(28,32,29,.12)",
  onSolid: "#FFFFFF", // text/glyphs sitting on saturated solid fills (same both modes)
} as const;

export type Palette = Record<keyof typeof palette, string>;

export const paletteDark: Palette = {
  teal: "#2AA894", tealHover: "#35B9A4", tealActive: "#1E8A78",
  tealTint: "#12332E", tealTint2: "#17423B", tealInk: "#7FD0C2",
  bg: "#151714", stage: "#1B1E1A", card: "#20241F", card2: "#1D211C",
  ink: "#E9E7DF", inkSoft: "#A9AFA7", inkFaint: "#787E76",
  line: "#33372F", lineStrong: "#42463D",
  coral: "#E07A5F", coralTint: "#3A241D",
  purple: "#9D7BE0", purpleTint: "#2C2440",
  amber: "#D89A3D", amberTint: "#3A2F19",
  green: "#4CAF7D", greenTint: "#1D3327",
  red: "#D96A55", redTint: "#3B211C",
  bandFrom: "#12332E", bandTo: "#17423B",
  bandInk: "#E9E7DF", bandInkSoft: "#7FD0C2",
  bandPill: "rgba(255,255,255,.10)", bandPillHover: "rgba(255,255,255,.06)",
  shadow1: "0 0 0 1px #33372F", shadow2: "0 8px 24px rgba(0,0,0,.45)",
  onSolid: "#FFFFFF",
};

export const FONT_STACK =
  "'Hind Siliguri', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const radii = { md: 14, sm: 10, lg: 20, card: 18, pill: 999 } as const;
export type ThemeMode = "light" | "dark";
export const paletteFor = (mode: ThemeMode) => (mode === "dark" ? paletteDark : palette);
