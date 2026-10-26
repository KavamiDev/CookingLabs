import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC compile les décorateurs NestJS avec leurs métadonnées (ce que le compilateur par défaut de Vitest ne fait pas).
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});
