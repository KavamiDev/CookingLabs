import sanitizeHtml from "sanitize-html";

// The only iframes allowed: the embed URL of a YouTube or Vimeo video, in https.
// The path is checked too: other pages of these sites (youtube.com/redirect) can lead anywhere.
const VIDEO_EMBED_URL =
  /^https:\/\/(www\.youtube\.com\/embed|www\.youtube-nocookie\.com\/embed|player\.vimeo\.com\/video)\/[\w-]+([?#].*)?$/;

// Removes everything dangerous from a lesson's HTML (scripts, onclick=..., javascript: links...).
// Used when a lesson is imported, and again before it is shown in the browser.
// Keeps text formatting, lists, tables, code, links, images and video iframes.
export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, {
    // Default safe tags (p, h1-h6, ul, table, pre, code, a...) + images and iframes
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "iframe"]),
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "title", "width", "height"],
      // No srcdoc (HTML inside the attribute) and no allow (camera, microphone...)
      iframe: ["src", "title", "width", "height", "allowfullscreen"],
    },
    // Only web and mail links: no javascript: or data: URLs
    allowedSchemes: ["http", "https", "mailto"],
    // Removed with their content: the library's default list + <title> and <noscript>
    nonTextTags: ["script", "style", "textarea", "option", "xmp", "title", "noscript"],
    // true = remove the tag
    exclusiveFilter: (frame) =>
      frame.tag === "iframe" && !VIDEO_EMBED_URL.test(frame.attribs.src ?? ""),
  });
}
