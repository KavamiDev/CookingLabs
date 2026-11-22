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
});
