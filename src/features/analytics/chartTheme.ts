import { useThemeMode } from "../../theme/ThemeContext";

// Chart palette roles, one map per mode — matches the approved mockup's palette.
const light = { you: "#2A78D6", peer: "#8A908A", top: "#2F8F5B",
  grid: "#E6E3DA", axis: "#8A908A", heatLow: "#E4F1EE", heatHigh: "#0E7A6B" };
const dark = { you: "#5B9BE6", peer: "#787E76", top: "#4CAF7D",
  grid: "#33372F", axis: "#787E76", heatLow: "#12332E", heatHigh: "#2AA894" };

export function useChartColors() {
  return useThemeMode().mode === "dark" ? dark : light;
}
