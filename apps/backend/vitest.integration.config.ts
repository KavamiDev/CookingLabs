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
  },
});
