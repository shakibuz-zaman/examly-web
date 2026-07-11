import katex from "katex";
import { useMemo } from "react";
import { env } from "../../lib/env";

// Storage keeps media srcs relative (/api/v1/media/{id}); the API may be on a
// different origin than the web app (5050 vs 5173 in dev), so rewrite for display.
function withAbsoluteMediaUrls(html: string): string {
  const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
  return html.replaceAll('src="/api/v1/media/', `src="${base}/api/v1/media/`);
}

// Pre-render math spans (span[data-latex]) to KaTeX markup inside the HTML string
// itself, so the rendered math is owned by dangerouslySetInnerHTML. Rendering into
// live DOM nodes from an effect is fragile: a later re-render discards the mutated
// nodes and React restores the empty source span, and the effect (keyed on html)
// never re-fires — leaving math blank.
function renderMath(html: string): string {
  if (!html.includes("data-latex")) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.body.querySelectorAll<HTMLElement>("span[data-latex]").forEach((el) => {
    const latex = el.getAttribute("data-latex") ?? "";
    try {
      el.innerHTML = katex.renderToString(latex, { throwOnError: false });
    } catch {
      el.textContent = latex; // never let bad LaTeX take the page down
    }
  });
  return doc.body.innerHTML;
}

type QuestionContentViewProps = {
  html: string;
};

/**
 * Renders server-sanitized question HTML. dangerouslySetInnerHTML is safe here
 * because the ONLY legitimate source of this html is the API, which passed it
 * through QuestionHtmlProcessor. Math spans (span[data-latex]) render via KaTeX.
 */
export function QuestionContentView({ html }: QuestionContentViewProps) {
  const rendered = useMemo(() => renderMath(withAbsoluteMediaUrls(html)), [html]);

  return (
    <div
      className="question-content"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
