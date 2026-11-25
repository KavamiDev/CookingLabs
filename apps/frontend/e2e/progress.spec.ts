import { expect, type Page, test } from "@playwright/test";

// Accounts and group created by apps/backend/prisma/seed.ts
const ADMIN = "admin@cookinglabs.local";
const STUDENT = "test@cookinglabs.local";
const PASSWORD = "azerty974";
const TEST_GROUP = "Groupe de test";

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  // The form only works once React is loaded
  await page.waitForLoadState("networkidle");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/cours");
}

// The admin creates a course with 5 lessons and opens it to the test student's group
async function createCourseWithFiveLessons(page: Page, title: string): Promise<number> {
  const created = await page.request.post("/api/courses", { data: { title } });
  expect(created.status()).toBe(201);
  const courseId: number = (await created.json()).id;

  for (let number = 1; number <= 5; number++) {
    const imported = await page.request.post(`/api/courses/${courseId}/lessons/import`, {
      multipart: {
        title: `Leçon ${number}`,
        file: {
          name: `lecon-${number}.html`,
          mimeType: "text/html",
          buffer: Buffer.from(`<p>Contenu de la leçon ${number}</p>`),
        },
      },
    });
    expect(imported.status()).toBe(201);
  }

  const groups: { id: number; name: string }[] = await (
    await page.request.get("/api/groups")
  ).json();
  const testGroup = groups.find((group) => group.name === TEST_GROUP);
  expect(testGroup).toBeDefined();
  const opened = await page.request.put(`/api/groups/${testGroup?.id}/courses/${courseId}`);
  expect(opened.status()).toBe(204);
  return courseId;
}

test("a student completes 2 lessons out of 5 and still sees 40 % after logging in again", async ({
  page,
  browser,
}) => {
  // Unique title: the tests can reuse an API started with the development database
  const courseTitle = `Cours progression ${Date.now()}`;
  await login(page, ADMIN);
  const courseId = await createCourseWithFiveLessons(page, courseTitle);

  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();
  // visible: Next keeps the previous page hidden in the DOM
  const visible = (locator: ReturnType<Page["locator"]>) => locator.filter({ visible: true });

  try {
    await login(student, STUDENT);
    const courseCard = student.locator("div.border-b").filter({ hasText: courseTitle });
    await expect(courseCard.getByText("0 % · 0 leçon sur 5")).toBeVisible();

    // "Commencer" opens the first lesson, which is not completed just by opening it
    await courseCard.getByRole("link", { name: "Commencer" }).click();
    await expect(visible(student.getByRole("heading", { name: "Leçon 1" }))).toBeVisible();
    const completeButton = visible(student.getByRole("button", { name: "Marquer comme terminée" }));
    await completeButton.dblclick(); // a double click must count once
    await expect(visible(student.getByText("✓ Leçon terminée"))).toBeVisible();

    // Lesson 3, from the course page
    await student.goto(`/cours/${courseId}`);
    await expect(student.getByText("20 % · 1 leçon sur 5")).toBeVisible();
    await student.getByRole("link", { name: "3. Leçon 3" }).click();
    await visible(student.getByRole("button", { name: "Marquer comme terminée" })).click();
    await expect(visible(student.getByText("✓ Leçon terminée"))).toBeVisible();

    // Log out, log in again: the progress is still there
    await student.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(student).toHaveURL("/connexion");
    await login(student, STUDENT);
    await expect(
      student
        .locator("div.border-b")
        .filter({ hasText: courseTitle })
        .getByText("40 % · 2 leçons sur 5"),
    ).toBeVisible();

    await student.goto(`/cours/${courseId}`);
    await expect(
      student.getByRole("progressbar", { name: `Progression dans ${courseTitle}` }),
    ).toHaveAttribute("aria-valuenow", "40");
    const lessons = student.getByRole("listitem");
    await expect(lessons.filter({ hasText: "Terminée" })).toHaveCount(2);
    await expect(lessons.filter({ hasText: "1. Leçon 1" })).toContainText("Terminée");
    await expect(lessons.filter({ hasText: "3. Leçon 3" })).toContainText("Terminée");

    // "Reprendre" goes to the first lesson not completed: lesson 2
    await student.getByRole("link", { name: "Reprendre" }).click();
    await expect(visible(student.getByRole("heading", { name: "Leçon 2" }))).toBeVisible();
  } finally {
    await studentContext.close();
    // Useful when the tests reuse an API already started with the development database
    await page.request.delete(`/api/courses/${courseId}`);
  }
});
