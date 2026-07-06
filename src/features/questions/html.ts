// Client-side mirror of the server's HasContent rule: real text, an image,
// or a math node counts as content.
export function htmlHasContent(html: string): boolean {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if ((doc.body.textContent ?? "").trim().length > 0) return true;
  return doc.body.querySelector("img, span[data-latex]") !== null;
}
