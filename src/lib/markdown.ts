import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

/** Renders note markdown to sanitized HTML. Nothing is loaded from the network:
 *  images are blocked and links are stripped by the sanitizer. */
export function renderMarkdown(text: string): string {
  const html = marked.parse(text ?? "", { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["img", "iframe", "object", "embed", "form", "input", "link", "style"],
    FORBID_ATTR: ["src", "srcset", "onerror", "onload"],
  });
}

/** Short single-line preview for list rows. */
export function plainPreview(text: string, maxLength = 120): string {
  const plain = (text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1)}…` : plain;
}
