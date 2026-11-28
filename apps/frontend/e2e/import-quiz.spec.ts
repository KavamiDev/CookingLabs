import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Accounts created by apps/backend/prisma/seed.ts
const ADMIN = "admin@cookinglabs.local";
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

// The admin creates a course with one lesson, through the API
async function createCourseWithLesson(page: Page, title: string) {
  const created = await page.request.post("/api/courses", { data: { title } });
  expect(created.status()).toBe(201);
  const courseId: number = (await created.json()).id;

  const imported = await page.request.post(`/api/courses/${courseId}/lessons/import`, {
    multipart: {
      title: "Pâte brisée",
      file: { name: "pate.html", mimeType: "text/html", buffer: Buffer.from("<p>Recette</p>") },
    },
  });
  expect(imported.status()).toBe(201);
  const lessonId: number = (await imported.json()).id;
  return { courseId, lessonId };
}

test("the admin downloads the template, imports it and sees the questions under the lesson", async ({
  page,
}) => {
  await login(page, ADMIN);
  // Unique title: the tests can reuse an API started with the development database
  const { courseId, lessonId } = await createCourseWithLesson(page, `Cours QCM ${Date.now()}`);
  const quizSection = page.locator("section").filter({ hasText: "QCM de la leçon" });

  try {
    await page.goto(`/cours/${courseId}/lecons/${lessonId}`);
    await expect(quizSection.getByText("Cette leçon n'a pas encore de QCM.")).toBeVisible();

    // The template link downloads the file served by the site
    const downloadPromise = page.waitForEvent("download");
    await quizSection.getByRole("link", { name: "fichier modèle" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("modele-qcm.json");
    const template = readFileSync(await download.path());

    // An invalid file first: the error gives the question number, nothing is saved
    const broken = JSON.parse(template.toString());
    broken.questions[1].choices = [{ text: "Farine", isCorrect: true }];
    await quizSection.locator('input[type="file"]').setInputFiles({
      name: "qcm.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(broken)),
    });
    await quizSection.getByRole("button", { name: "Importer le QCM" }).click();
    await expect(quizSection.getByRole("alert")).toContainText(
      "Question 2 : il faut au moins 2 choix",
    );
    await expect(quizSection.getByText("Cette leçon n'a pas encore de QCM.")).toBeVisible();

    // Then the template itself
    await quizSection.locator('input[type="file"]').setInputFiles({
      name: "modele-qcm.json",
      mimeType: "application/json",
      buffer: template,
    });
    await quizSection.getByRole("button", { name: "Importer le QCM" }).click();

    await expect(quizSection.getByText("3 questions · seuil de réussite : 70 %")).toBeVisible();
    await expect(
      quizSection.getByText("1. Quelle farine utilise-t-on pour une pâte brisée ?"),
    ).toBeVisible();
    const firstQuestion = quizSection.getByRole("listitem").filter({ hasText: "1. Quelle farine" });
    await expect(firstQuestion.getByText("Farine T55 (bonne réponse)")).toBeVisible();
    await expect(quizSection.getByRole("alert")).toHaveCount(0);
  } finally {
    // Useful when the tests reuse an API already started with the development database
    await page.request.delete(`/api/courses/${courseId}`);
  }
});
