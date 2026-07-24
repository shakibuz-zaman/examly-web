import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "tonal" | "outline" | "ghost";
  size?: "md" | "sm";
};

// §3.5 pill buttons. Plain <button> so form/type/disabled/aria pass through.
export function PillButton({ variant = "tonal", size = "md", className, ...rest }: Props) {
  const cls = ["ex-btn", `ex-btn--${variant}`, size === "sm" ? "ex-btn--sm" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <button type="button" {...rest} className={cls} />;
}
