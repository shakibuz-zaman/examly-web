import { Link } from "react-router-dom";
import { Illustration } from "../components/Illustration";
import { PillButton } from "./PillButton";

// §4: variant="filtered" (no illustration, reset CTA) vs "empty" (illustration + cross-link
// CTA). "success" is the third state the empty branch kept collapsing into "empty": nothing
// LEFT to do (a cleared revision queue) rather than nothing here yet — same layout, the
// check illustration instead of the open folder, so a finished pile doesn't read as a void.
// The action is a <Link> when the CTA leads somewhere (actionTo) and a button when it acts
// in place (onAction); both come from the same actionLabel.
export function EmptyState({
  variant,
  message,
  actionLabel,
  actionTo,
  onAction,
}: {
  variant: "filtered" | "empty" | "success";
  message: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}) {
  return (
    <div className="ex-empty">
      {/* Illustration names track the variants 1:1, so the non-filtered variants pass the
          variant straight through — a new variant needs its art added, not a branch. */}
      {variant !== "filtered" && <Illustration name={variant} />}
      <p className="ex-empty-msg">{message}</p>
      {actionLabel &&
        (actionTo ? (
          // A cross-page CTA is a destination, so it ships as a real href: middle-click,
          // copy-link and the back stack all work, and it announces as a link. It also
          // carries the primary weight — on a page with nothing on it this is the one thing
          // left to do — while the in-place reset below stays tonal, since it only walks a
          // filter back rather than leaving.
          <Link className="ex-btn ex-btn--primary" to={actionTo}>
            {actionLabel}
          </Link>
        ) : (
          onAction && (
            <PillButton variant="tonal" onClick={onAction}>
              {actionLabel}
            </PillButton>
          )
        ))}
    </div>
  );
}
