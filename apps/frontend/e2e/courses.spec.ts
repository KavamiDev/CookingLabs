import { expect, test } from "@playwright/test";

test("la page de cours affiche un cours", async ({ page }) => {
  await page.goto("/cours");
  await expect(page.getByRole("heading", { name: "Vos Cours" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retour à l'accueil" })).toBeVisible();
});
