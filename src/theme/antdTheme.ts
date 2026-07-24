import { theme as antd, type ThemeConfig } from "antd";
import { FONT_STACK, paletteFor, type ThemeMode } from "./tokens";

export type AppDensity = "student" | "examiner";

export function buildTheme(density: AppDensity, mode: ThemeMode): ThemeConfig {
  const p = paletteFor(mode);
  const algorithms =
    mode === "dark"
      ? density === "examiner"
        ? [antd.darkAlgorithm, antd.compactAlgorithm]
        : [antd.darkAlgorithm]
      : density === "examiner"
        ? [antd.compactAlgorithm]
        : [antd.defaultAlgorithm];
  return {
    algorithm: algorithms,
    token: {
      colorPrimary: p.teal,
      colorInfo: p.teal,
      colorSuccess: p.green,
      colorWarning: p.amber,
      colorError: p.red,
      colorBgLayout: p.bg,
      colorBgContainer: p.card,
      colorText: p.ink,
      colorTextSecondary: p.inkSoft,
      colorTextTertiary: p.inkFaint,
      colorBorder: p.lineStrong,
      colorBorderSecondary: p.line,
      borderRadius: density === "student" ? 14 : 10,
      fontFamily: FONT_STACK,
      fontSize: density === "student" ? 15 : 14,
      controlHeight: density === "student" ? 40 : 32,
    },
    components: {
      Layout: { headerBg: p.card, siderBg: p.card, bodyBg: p.bg },
      Button: density === "student" ? { controlHeight: 44 } : {},
      Card: { colorBgContainer: p.card },
      Menu: { itemSelectedColor: p.tealInk, itemSelectedBg: p.tealTint },
    },
  };
}
