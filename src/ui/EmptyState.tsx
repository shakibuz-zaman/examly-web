import { Illustration } from "../components/Illustration";
import { PillButton } from "./PillButton";

// §4: variant="filtered" (no illustration, reset CTA) vs "empty" (illustration + cross-link CTA).
export function EmptyState({
  variant,
  message,
  actionLabel,
  onAction,
}: {
  variant: "filtered" | "empty";
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="ex-empty">
      {variant === "empty" && <Illustration name="empty" />}
      <p className="ex-empty-msg">{message}</p>
      {actionLabel && onAction && (
        <PillButton variant="tonal" onClick={onAction}>
          {actionLabel}
        </PillButton>
      )}
    </div>
  );
}
