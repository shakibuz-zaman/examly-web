import katex from "katex";
import { useEffect, useRef } from "react";
import { env } from "../../lib/env";

// Storage keeps media srcs relative (/api/v1/media/{id}); the API may be on a
// different origin than the web app (5050 vs 5173 in dev), so rewrite for display.
function withAbsoluteMediaUrls(html: string): string {
  const base = env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl.slice(0, -1) : env.apiBaseUrl;
  return html.replaceAll('src="/api/v1/media/', `src="${base}/api/v1/media/`);
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("span[data-latex]").forEach((el) => {
      const latex = el.getAttribute("data-latex") ?? "";
      try {
        katex.render(latex, el, { throwOnError: false });
      } catch {
        el.textContent = latex; // never let bad LaTeX take the page down
      }
    });
  }, [html]);

  return (
    <div
      ref={ref}
      className="question-content"
      dangerouslySetInnerHTML={{ __html: withAbsoluteMediaUrls(html) }}
    />
  );
}
