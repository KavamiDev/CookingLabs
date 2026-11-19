import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// Tests d'intégration : une vraie base PostgreSQL lancée dans Docker par Testcontainers.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    globals: true,
    include: ["test/**/*.integration.spec.ts"],
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // The API refuses to start without JWT_SECRET (see src/config/env.ts)
    env: { JWT_SECRET: "secret-de-test" },
  },
});
