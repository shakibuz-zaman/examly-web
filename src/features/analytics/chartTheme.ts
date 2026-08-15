import { paletteFor } from "../../theme/tokens";
import { useThemeMode } from "../../theme/ThemeContext";

// Chart palette roles. `you`/`top` are chart-specific series colours and keep their own
// values; everything a chart shares with the rest of the app (peer ink, grid, axis ink,
// heat ramp ends) now comes from the token module, so a palette change cannot leave
// charts behind. `peer` was a hand-copied duplicate of inkFaint in both modes (light
// #8A908A, dark #787E76) — it reads the token now, leaving the hand-picked hues here.
//
// This file is the ONE place a chart hue may be written as a literal: recharts takes
// `fill`/`stroke` as strings and resolves nothing, so a `var(--ex-*)` handed to a <Cell>
// or a <Line> is a dead string. Components import from here; they never carry a hex.
//
// `bucket` and `lowSample` are the two de-emphasised fills. Light keeps the exact values
// they replace inline; dark cannot reuse them (a pale tint that recedes on a white card
// *glares* on the warm charcoal one — the old shared #B7D3F6 came out at 10.2:1 there,
// twice `you`'s 5.5:1, so the de-emphasised bars shouted louder than the emphasised one).
// Dark follows the inversion the token module's tints already use (tealTint #E4F1EE →
// #12332E): pull the lightness and the chroma down together.
//
// They are measured against DIFFERENT neighbours, which is why they are not one colour:
//   bucket    — a recharts <Cell> on the card, nothing behind it. Judged on --ex-card:
//               #4E7BAF = 3.58:1 (3.71 on card-2), clearing 1.4.11's 3:1 while sitting
//               visibly below `you` (5.46:1), so the caption's «গাঢ় বার» still reads as
//               the emphasised one — by chroma in dark, by darkness in light.
//   lowSample — a bar drawn ON TOP OF --ex-track, so the track is the contrast partner and
//               the card is irrelevant. That is the trap here: the obvious "dimmer than
//               `you`" pick (#6B8299) scored a healthy 3.96:1 on the card and 1.05:1 on
//               the track — i.e. invisible against the rail it lives in. #8C9DAF instead
//               holds `you`'s brightness and drops only the chroma: 1.50:1 on the track,
//               matching `you`'s own 1.44:1 separation, so a small-sample bar is exactly as
//               legible as a normal one while reading washed out. (Light does the same job
//               the other way: #9EC5F4 is 1.82:1 on the track.) Colour is never the only
//               channel for it either — the row also carries the «আরও প্রশ্ন দরকার» tag.
const series = {
  light: { you: "#2A78D6", top: "#2F8F5B", bucket: "#B7D3F6", lowSample: "#9EC5F4" },
  dark: { you: "#5B9BE6", top: "#4CAF7D", bucket: "#4E7BAF", lowSample: "#8C9DAF" },
};

export function useChartColors() {
  const { mode } = useThemeMode();
  const p = paletteFor(mode);
  return {
    ...series[mode],
    peer: p.inkFaint,
    grid: p.line,
    axis: p.inkFaint,
    heatLow: p.tealTint,
    heatHigh: p.teal,
  };
}
