import { expect, test } from "@playwright/test";

// Without a session cookie, every page leads to the login page (proxy.ts)
for (const path of ["/cours", "/cours/creer", "/cours/1", "/cours/1/lecons/1"]) {
  test(`a visitor who opens ${path} is sent to the login page`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL("/connexion");
    await expect(page.getByRole("heading", { name: "Bon retour en cuisine" })).toBeVisible();
  });
}
