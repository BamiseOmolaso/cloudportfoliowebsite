import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtmlServer(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "span",
      "strong",
      "sub",
      "sup",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: [
      "style",
      "script",
      "iframe",
      "object",
      "embed",
      "link",
      "meta",
      "form",
      "svg",
      "math",
    ],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}
