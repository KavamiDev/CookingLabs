import { sanitizeLessonHtml } from "./sanitize-lesson-html.js";

describe("sanitizeLessonHtml", () => {
  it("keeps the text formatting", () => {
    const html = "<h2>Pâte brisée</h2><p>Mélanger <strong>200 g</strong> de farine.</p>";
    expect(sanitizeLessonHtml(html)).toBe(html);
  });

  it("removes <script> tags and their content", () => {
    expect(sanitizeLessonHtml("<p>Bonjour</p><script>alert(1)</script>")).toBe("<p>Bonjour</p>");
  });

  it("removes event handlers like onclick and onerror", () => {
    expect(sanitizeLessonHtml('<img src="https://x.fr/a.png" onerror="alert(1)" />')).toBe(
      '<img src="https://x.fr/a.png" />',
    );
  });

  it("removes javascript: links", () => {
    expect(sanitizeLessonHtml('<a href="javascript:alert(1)">clic</a>')).toBe("<a>clic</a>");
  });

  it.each([
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ?start=10",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    "https://player.vimeo.com/video/76979871",
  ])("keeps the video iframe %s", (src) => {
    const html = `<iframe src="${src}" allowfullscreen></iframe>`;
    expect(sanitizeLessonHtml(html)).toBe(html);
  });

  it.each([
    ["another site", "https://evil.example/embed/abc"],
    ["a look-alike domain", "https://www.youtube.com.evil.example/embed/abc"],
    ["a fake user name", "https://www.youtube.com@evil.example/embed/abc"],
    ["a host hidden by a backslash", "https://evil.example\\@www.youtube.com/embed/abc"],
    ["a YouTube redirection", "https://www.youtube.com/redirect?q=https://evil.example"],
    ["a path that climbs back", "https://www.youtube.com/embed/../redirect?q=evil"],
    ["an encoded path", "https://www.youtube.com/embed/%2e%2e/redirect"],
    ["http", "http://www.youtube.com/embed/abc"],
    ["a URL without protocol", "//www.youtube.com/embed/abc"],
    ["a relative URL", "/cours"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["an empty src", ""],
  ])("removes an iframe with %s", (_case, src) => {
    const html = `<p>Avant</p><iframe src="${src}"></iframe><p>Après</p>`;
    expect(sanitizeLessonHtml(html)).toBe("<p>Avant</p><p>Après</p>");
  });

  it.each([
    "<iframe></iframe>",
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<iframe src="https://evil.example">',
    '<iframe src="https://evil.example" />',
  ])("removes the iframe %s", (html) => {
    expect(sanitizeLessonHtml(html)).toBe("");
  });

  it("removes dangerous attributes from a video iframe", () => {
    const src = "https://player.vimeo.com/video/76979871";
    const html = `<iframe src="${src}" srcdoc="x" onload="alert(1)" allow="camera"></iframe>`;
    expect(sanitizeLessonHtml(html)).toBe(`<iframe src="${src}"></iframe>`);
  });

  it.each([
    "<ScRiPt>alert(1)</sCrIpT>",
    '<script src="https://evil.example/a.js"></script>',
    "<scr<script>x</script>ipt>alert(1)</script>",
    "<svg onload=alert(1)></svg>",
    "<img src=x onerror=alert(1)>",
    '<a href="jav&#x09;ascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
    '<form action="https://evil.example"><input name="password"></form>',
  ])("leaves nothing executable in %s", (html) => {
    expect(sanitizeLessonHtml(html)).not.toMatch(
      /<script|<svg|<math|<style|<form|<input|<[^>]*\son\w+=|<[^>]*javascript:/i,
    );
  });

  it("keeps only the content of a full HTML page, without its <title> and <style>", () => {
    const html =
      "<!doctype html><html><head><title>Onglet</title><style>p{color:red}</style></head>" +
      "<body><p>Recette</p></body></html>";
    expect(sanitizeLessonHtml(html)).toBe("<p>Recette</p>");
  });

  // The HTML is cleaned at import, then again when the lesson is read
  it("gives the same result when it runs twice", () => {
    const once = sanitizeLessonHtml(
      '<p>Sel & poivre &lt;script&gt; "fin"</p><iframe src="https://www.youtube.com/embed/abc?start=1&amp;rel=0"></iframe>',
    );
    expect(sanitizeLessonHtml(once)).toBe(once);
  });
});
