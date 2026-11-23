import { type Browser, expect, type Page, test } from "@playwright/test";

// Accounts created by apps/backend/prisma/seed.ts
const ADMIN = "admin@cookinglabs.local";
const STUDENT = "test@cookinglabs.local";
const STUDENT_LABEL = "Élève CookingLabs (test@cookinglabs.local)";
const PASSWORD = "azerty974";

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  // The form only works once React is loaded
  await page.waitForLoadState("networkidle");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/cours");
}

async function newStudentPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, STUDENT);
  return page;
}

test("a student reads a course only while one of their groups opens it", async ({
  page,
  browser,
}) => {
  // Unique names: the tests can reuse an API started with the development database
  const stamp = Date.now();
  const courseTitle = `Cours réservé ${stamp}`;
  const groupName = `Promo e2e ${stamp}`;

  await login(page, ADMIN);
  const created = await page.request.post("/api/courses", { data: { title: courseTitle } });
  expect(created.status()).toBe(201);
  const courseId: number = (await created.json()).id;
  const studentPage = await newStudentPage(browser);

  try {
    // Before: the course is closed to the student, by URL and by API
    await studentPage.goto(`/cours/${courseId}`);
    await expect(
      studentPage.getByRole("heading", { name: "Vous n'avez pas accès à ce cours" }),
    ).toBeVisible();
    expect((await studentPage.request.get(`/api/courses/${courseId}`)).status()).toBe(403);

    // The admin creates the group, adds the student and opens the course
    await page.getByRole("link", { name: "Groupes" }).click();
    await expect(page).toHaveURL("/groupes");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Nom du nouveau groupe").fill(groupName);
    await page.getByRole("button", { name: "Créer le groupe" }).click();

    const group = page.getByRole("region", { name: groupName });
    await expect(group).toBeVisible();
    await group.getByLabel("Ajouter un élève").selectOption({ label: STUDENT_LABEL });
    await group.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(group.getByRole("listitem").filter({ hasText: STUDENT })).toBeVisible();
    await group.getByLabel("Ouvrir un cours").selectOption({ label: courseTitle });
    await group.getByRole("button", { name: "Ouvrir", exact: true }).click();
    await expect(group.getByRole("listitem").filter({ hasText: courseTitle })).toBeVisible();

    // The student now sees the course in their list and can open it
    await studentPage.goto("/cours");
    await studentPage.getByRole("link", { name: courseTitle }).click();
    await expect(studentPage.getByRole("heading", { name: courseTitle })).toBeVisible();

    // Removed from the group: the access stops at once, by URL and by API
    await group.getByRole("button", { name: `Retirer ${STUDENT} du groupe` }).click();
    await expect(group.getByText("Aucun élève.")).toBeVisible();

    await studentPage.goto(`/cours/${courseId}`);
    await expect(
      studentPage.getByRole("heading", { name: "Vous n'avez pas accès à ce cours" }),
    ).toBeVisible();
    expect((await studentPage.request.get(`/api/courses/${courseId}`)).status()).toBe(403);
    await studentPage.goto("/cours");
    await expect(studentPage.getByRole("link", { name: courseTitle })).toHaveCount(0);

    // The admin deletes the group
    page.once("dialog", (dialog) => dialog.accept());
    await group.getByRole("button", { name: "Supprimer le groupe" }).click();
    await expect(page.getByRole("region", { name: groupName })).toHaveCount(0);
  } finally {
    await studentPage.context().close();
    // Useful when the tests reuse an API already started with the development database
    await page.request.delete(`/api/courses/${courseId}`);
    const groups: { id: number; name: string }[] = await (
      await page.request.get("/api/groups")
    ).json();
    const leftover = groups.find((group) => group.name === groupName);
    if (leftover) {
      await page.request.delete(`/api/groups/${leftover.id}`);
    }
  }
});

test("a student who opens /groupes sees that the page is for admins", async ({ page }) => {
  await login(page, STUDENT);
  await page.goto("/groupes");
  await expect(
    page.getByRole("heading", { name: "Accès réservé aux administrateurs" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Groupes" })).toHaveCount(0);
});
