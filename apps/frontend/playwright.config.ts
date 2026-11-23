import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout : un vrai navigateur parcourt le site comme un utilisateur.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // API + throwaway PostgreSQL (Docker required). Not "pnpm run": pnpm starts the script in
      // another process group, and Playwright could not stop the API at the end of the tests.
      command: "node_modules/.bin/nest build && exec node --import tsx test/e2e-server.ts",
      cwd: "../backend",
      url: "http://localhost:3001/api/health",
      timeout: 180_000, // the first run downloads the PostgreSQL image
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
