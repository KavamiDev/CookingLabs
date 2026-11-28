import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Account created by apps/backend/prisma/seed.ts
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

test("the admin downloads the template, fixes an error, then imports the students", async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto("/groupes");
  await page.waitForLoadState("networkidle");
  const importSection = page.locator("section").filter({ hasText: "Importer des élèves" });

  // The template link downloads the file served by the site
  const downloadPromise = page.waitForEvent("download");
  await importSection.getByRole("link", { name: "Télécharger le fichier modèle" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("modele-eleves.csv");
  const template = readFileSync(await download.path(), "utf-8");

  // Unique e-mails and groups: the tests can reuse an API started with the development database
  const stamp = Date.now();
  const csv = template
    .replaceAll("@exemple.fr", `.${stamp}@exemple.fr`)
    .replaceAll("CAP Cuisine 1", `CAP Cuisine 1 ${stamp}`)
    .replaceAll("BTS Hôtellerie 2", `BTS Hôtellerie 2 ${stamp}`);
  const fileInput = importSection.getByLabel("Fichier CSV");

  // A wrong e-mail on line 3: nothing is imported, the line is given
  const broken = csv.replace(`leo.martin.${stamp}@exemple.fr`, "leo.martin");
  await fileInput.setInputFiles({
    name: "eleves.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(broken),
  });
  await importSection.getByRole("button", { name: "Importer les élèves" }).click();
  await expect(importSection.getByRole("alert")).toContainText(
    "Ligne 3 : l'e-mail « leo.martin » n'est pas valide",
  );
  await expect(page.getByRole("region", { name: `CAP Cuisine 1 ${stamp}` })).toHaveCount(0);

  // The fixed file
  await fileInput.setInputFiles({
    name: "eleves.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await importSection.getByRole("button", { name: "Importer les élèves" }).click();
  await expect(importSection.getByRole("status")).toContainText("3 élèves importés.");
  await expect(importSection.getByRole("status")).toContainText(
    // In the order of the file
    `Groupes créés : CAP Cuisine 1 ${stamp}, BTS Hôtellerie 2 ${stamp}.`,
  );

  // The new groups contain their students
  const cap = page.getByRole("region", { name: `CAP Cuisine 1 ${stamp}` });
  await expect(
    cap.getByRole("listitem").filter({ hasText: `marie.curie.${stamp}@exemple.fr` }),
  ).toBeVisible();
  await expect(
    cap.getByRole("listitem").filter({ hasText: `leo.martin.${stamp}@exemple.fr` }),
  ).toBeVisible();
  const bts = page.getByRole("region", { name: `BTS Hôtellerie 2 ${stamp}` });
  await expect(
    bts.getByRole("listitem").filter({ hasText: `ines.diallo.${stamp}@exemple.fr` }),
  ).toBeVisible();
});
