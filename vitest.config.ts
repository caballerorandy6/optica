import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // solo tests unitarios; los E2E (tests/e2e) los corre Playwright, no Vitest
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // mismo alias "@/" que usa Next (tsconfig), para que los imports resuelvan
    alias: { "@": path.resolve(__dirname, "src") },
  },
})
