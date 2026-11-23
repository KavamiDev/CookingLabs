import { type BrowserContext, expect, type Page, test } from "@playwright/test";

// Accounts created by apps/backend/prisma/seed.ts
const ADMIN = "admin@cookinglabs.local";
const STUDENT = "test@cookinglabs.local";
const PASSWORD = "azerty974";

// Each payload sets window.hacked when it runs
const MALICIOUS_HTML = `
  <h2>Pâte sucrée</h2>
  <p>Mélanger le beurre.</p>
  <script>window.hacked = true</script>
  <img src="data:image/png;base64,broken" onerror="window.hacked = true">
  <svg onload="window.hacked = true"></svg>
  <a href="javascript:window.hacked = true">Lien piégé</a>
  <iframe src="https://evil.example/embed"></iframe>
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
`;

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  // The form only works once React is loaded
  await page.waitForLoadState("networkidle");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/cours");
}

// No real request to the video and attacker sites during the tests
async function blockOtherSites(context: BrowserContext) {
  await context.route(/^https:\/\/(www\.youtube\.com|evil\.example)\//, (route) =>
    route.fulfill({ contentType: "text/html", body: "" }),
  );
}

async function expectSafeLesson(page: Page) {
  // visible: Next keeps the previous page hidden in the DOM
  const article = page.locator("article.lesson-content").filter({ visible: true });
  await expect(article.getByText("Mélanger le beurre.")).toBeVisible();
  await expect(article.locator("script, svg, [onerror], [onload], a[href]")).toHaveCount(0);
  await expect(article.locator("iframe")).toHaveCount(1);
  await expect(article.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  );
  await article.getByText("Lien piégé").click();
  expect(await page.evaluate(() => "hacked" in window)).toBe(false);
}

test("the test payload does run when it is not sanitized", async ({ page, context }) => {
  // Without this test, the next one would also pass with a harmless payload
  await blockOtherSites(context);
  await page.setContent(MALICIOUS_HTML);
  await expect.poll(() => page.evaluate(() => "hacked" in window)).toBe(true);
});

test("a <script> in an imported lesson is never executed", async ({ page, browser }) => {
  await blockOtherSites(page.context());
  await login(page, ADMIN);

  const created = await page.request.post("/api/courses", { data: { title: "Test import HTML" } });
  expect(created.status()).toBe(201);
  const courseUrl = `/cours/${(await created.json()).id}`;

  try {
    await page.goto(courseUrl);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Fichier HTML").setInputFiles({
      name: "Pâte sucrée.html",
      mimeType: "text/html",
      buffer: Buffer.from(MALICIOUS_HTML),
    });
    await expect(page.getByLabel("Titre de la leçon")).toHaveValue("Pâte sucrée");
    await page.getByRole("button", { name: "Importer la leçon" }).click();

    await expect(page).toHaveURL(new RegExp(`${courseUrl}/lecons/\\d+$`));
    const lessonUrl = page.url();
    await expectSafeLesson(page); // client navigation

    // Back to the course: the new lesson is in the list
    await page.getByRole("link", { name: "← Test import HTML" }).click();
    await expect(
      page.getByRole("link", { name: "1. Pâte sucrée" }).filter({ visible: true }),
    ).toBeVisible();

    // Full page load: this is when a <script> in the HTML would run
    await page.goto(lessonUrl);
    await expectSafeLesson(page);

    // Same for a student, who has no import form
    const studentContext = await browser.newContext();
    await blockOtherSites(studentContext);
    const studentPage = await studentContext.newPage();
    await login(studentPage, STUDENT);
    await studentPage.goto(courseUrl);
    await expect(studentPage.getByRole("link", { name: "1. Pâte sucrée" })).toBeVisible();
    await expect(studentPage.getByLabel("Fichier HTML")).toHaveCount(0);
    await studentPage.goto(lessonUrl);
    await expectSafeLesson(studentPage);
    await studentContext.close();
  } finally {
    // Useful when the tests reuse an API already started with the development database
    await page.request.delete(courseUrl.replace("/cours/", "/api/courses/"));
  }
});
