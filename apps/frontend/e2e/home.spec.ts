import { expect, test } from "@playwright/test";

test("la page d'accueil affiche CookingLabs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CookingLabs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});
