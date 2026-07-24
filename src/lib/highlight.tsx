import type { ReactNode } from "react";

// Wraps every case-insensitive occurrence of q in <mark>. Plain substring split —
// no regex, so user input never needs escaping here.
export function highlightText(text: string, q?: string | null): ReactNode {
  const needle = q?.trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const nlower = needle.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  for (;;) {
    const at = lower.indexOf(nlower, i);
    if (at === -1) break;
    if (at > i) parts.push(text.slice(i, at));
    parts.push(<mark key={at}>{text.slice(at, at + needle.length)}</mark>);
    i = at + needle.length;
  }
  if (parts.length === 0) return text;
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}
