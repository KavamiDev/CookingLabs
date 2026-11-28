import { expect, test } from "@playwright/test";

// Invited student created by apps/backend/prisma/seed.ts, with a known link.
// The link works once: with an API already started on the development database,
// run `pnpm --filter backend db:seed` again before running this test a second time.
const INVITED_EMAIL = "invite@cookinglabs.local";
const ACTIVATION_URL = "/activation?token=lien-de-test";
const NEW_PASSWORD = "ma phrase de passe secrète";
// getByRole("main"): Next.js adds its own empty "alert" (route announcer) outside the page

test("a visitor with a wrong link sees a clear message", async ({ page }) => {
  await page.goto("/activation?token=lien-invente");
  // Public page: no redirection to the login page
  await expect(page).toHaveURL("/activation?token=lien-invente");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Mot de passe", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Activer mon compte" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Ce lien d'invitation n'est plus valable : il a déjà été utilisé ou est incorrect.",
  );
});

test("the invited student chooses a password, then logs in with it", async ({ page }) => {
  await page.goto(ACTIVATION_URL);
  // The form only works once React is loaded
  await page.waitForLoadState("networkidle");

  // Two different passwords: refused before calling the API
  await page.getByLabel("Mot de passe", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill("une autre phrase");
  await page.getByRole("button", { name: "Activer mon compte" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Les deux mots de passe ne sont pas identiques.",
  );

  await page.getByLabel("Confirmer le mot de passe").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Activer mon compte" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Votre compte est activé. Vous pouvez maintenant vous connecter.",
  );

  await page.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/connexion");
  await page.waitForLoadState("networkidle");
  await page.locator("#email").fill(INVITED_EMAIL);
  await page.locator("#password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/cours");

  // The link only works once
  await page.context().clearCookies();
  await page.goto(ACTIVATION_URL);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Mot de passe", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Activer mon compte" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("déjà été utilisé");
});
