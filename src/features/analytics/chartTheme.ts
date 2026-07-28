import { paletteFor } from "../../theme/tokens";
import { useThemeMode } from "../../theme/ThemeContext";

// Chart palette roles. `you`/`top` are chart-specific series colours and keep their own
// values; everything a chart shares with the rest of the app (peer ink, grid, axis ink,
// heat ramp ends) now comes from the token module, so a palette change cannot leave
// charts behind. `peer` was a hand-copied duplicate of inkFaint in both modes (light
// #8A908A, dark #787E76) — it reads the token now, leaving two hand-picked hues.
const series = {
  light: { you: "#2A78D6", top: "#2F8F5B" },
  dark: { you: "#5B9BE6", top: "#4CAF7D" },
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
