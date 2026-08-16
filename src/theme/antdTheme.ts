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
      // §9 examiner table density: a 36px row. A 13px cell lands a 21.67px line box under
      // the compact algorithm, so 7px of block padding either side plus the 1px row
      // hairline measures 36.67px in the browser — the §9 target. Every size tier
      // gets the same numbers on purpose — examiner tables are a mix of default-size and
      // `size="small"` call sites (WeakestTopicsList), and a scan down the app must not
      // change rhythm because one page passed a prop. Header type is NOT set here: the
      // overline treatment is a ui.css rule (`.ex-exshell … thead th`) so it can carry
      // letter-spacing, which has no component token.
      Table:
        density === "examiner"
          ? {
              cellPaddingBlock: 7, cellPaddingBlockMD: 7, cellPaddingBlockSM: 7,
              cellPaddingInline: 12, cellPaddingInlineMD: 12, cellPaddingInlineSM: 12,
              cellFontSize: 13, cellFontSizeMD: 13, cellFontSizeSM: 13,
              // card-2, not the derived colorFillAlter: examiner tables live inside a Card
              // (colorBgContainer = card), and the warm off-white is the house's own
              // "one step off the card" surface in both modes.
              headerBg: p.card2,
              borderColor: p.line,
              rowHoverBg: p.stage,
            }
          : {},
    },
  };
}
