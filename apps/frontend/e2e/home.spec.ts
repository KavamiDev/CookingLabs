import { expect, test } from "@playwright/test";

test("localhost:3000 sends a visitor to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/connexion");
  await expect(page.getByRole("heading", { name: "Bon retour en cuisine" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});
