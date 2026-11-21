import sanitizeHtml from "sanitize-html";

// Removes everything dangerous from a lesson's HTML (scripts, onclick=..., javascript: links...)
// before it is shown in the browser. Keeps text formatting, lists, tables, code, links and images.
export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, {
    // Default safe tags (p, h1-h6, ul, table, pre, code, a...) + images
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title", "width", "height"],
    },
    // Only web and mail links: no javascript: or data: URLs
    allowedSchemes: ["http", "https", "mailto"],
  });
}
