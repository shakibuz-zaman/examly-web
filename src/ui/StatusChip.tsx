import { bnNum } from "../lib/bn";
import { CONTENT_STATUS, DIFFICULTY } from "../lib/labels";
import type { TimeStatus } from "../lib/catalogStatus";

// §3.4 time-status chip: tint bg + dot + ink. Label is caller-supplied Bengali.
export function TimeStatusChip({ status, label }: { status: TimeStatus; label: string }) {
  return (
    <span className={`ex-chipstat ex-chipstat--${status}`}>
      <span className="ex-chipstat-dot" aria-hidden />
      {label}
    </span>
  );
}

// §3.4 price/ownership chip: ownership wins over price.
export function PriceChip({ priceBdt, owned }: { priceBdt: number; owned: boolean }) {
  // The ✓ is a tint on the word, not a second fact: «কেনা আছে» already says owned, so the
  // glyph is decorative and would only add "check mark" to the announcement.
  if (owned)
    return (
      <span className="ex-chipstat ex-chipstat--owned">
        <span aria-hidden>✓</span> কেনা আছে
      </span>
    );
  if (priceBdt === 0) return <span className="ex-chipstat ex-chipstat--free">ফ্রি</span>;
  return <span className="ex-chipstat ex-chipstat--price">৳{bnNum(priceBdt)}</span>;
}

// §9 examiner content status. The union is the superset of three wire enums — questions and
// admin qbank papers ("draft" | "active" | "archived", types.ts:87/:699) and exams and model
// tests (ExamStatus, types.ts:151) — so every call site's own narrower status assigns to it,
// and a server that grows a fifth state fails at the call site instead of here.
export type ContentStatus = "draft" | "active" | "published" | "archived";

// Four tint classes, one per state, even though `--published` and `--free` resolve to the
// same two tokens today: a chip class is a *vocabulary* entry, not a colour alias. Sharing
// `--free` would mean re-tinting the price vocabulary silently re-tints exam status.
// No dot: the dot in TimeStatusChip separates chips that otherwise read alike in a dense
// catalog row; here the four Bengali labels are already distinct, and a same-colour dot in
// a 36px table cell is noise. Ink-on-tint measured (light / dark): draft 4.51 / 5.38,
// active 6.81 / 7.61, published 4.53 / 4.97, archived 5.70 / 7.52 — all AA on the card
// surface examiner tables paint on.
export function ContentStatusChip({ status }: { status: ContentStatus }) {
  // The prop is a closed union but the wire is untyped JSON and `strictNullChecks` is off,
  // so an unknown status can still reach here at runtime. Neutral tint plus the raw key
  // beats an unstyled transparent chip with an empty label.
  // `typeof === "string"`, not truthiness (same guard as ExaminerHeader's breadcrumb walk):
  // CONTENT_STATUS is a plain object literal, so a wire value like "constructor" resolves
  // through Object.prototype to a *function* — truthy, so it would pick an unstyled tint
  // class and then hand React a function as a child, which throws.
  const hit = CONTENT_STATUS[status];
  const label = typeof hit === "string" ? hit : null;
  return (
    <span className={`ex-chipstat ex-chipstat--${label ? status : "archived"}`}>
      {label ?? status}
    </span>
  );
}

export type Difficulty = "easy" | "medium" | "hard";

// §9 difficulty cell: colour dot + the Bengali word. The dot is aria-hidden — it restates
// the label beside it, and the label is the fact AT reads. Colour alone never carries this.
export function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  // typeof-guarded for the same reason as ContentStatusChip above: DIFFICULTY is a plain
  // object literal, and a prototype key ("constructor") would otherwise reach React as a
  // function child. The dot needs no guard — an unmatched modifier class just falls back
  // to the ink-faint fill.
  const hit = DIFFICULTY[difficulty];
  return (
    <span className="ex-diffdot">
      <span className={`ex-diffdot-mark ex-diffdot-mark--${difficulty}`} aria-hidden />
      {typeof hit === "string" ? hit : difficulty}
    </span>
  );
}
