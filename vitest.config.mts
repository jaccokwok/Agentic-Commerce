import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node", pool: "threads", execArgv: ["--experimental-sqlite"], include: ["lib/**/*.test.ts"],
    reporters: ["verbose"],
    coverage: {
      provider: "v8", include: ["lib/**/*.ts"], exclude: ["lib/**/*.test.ts"], reporter: ["text", "json-summary"],
      thresholds: { statements: 81.33, branches: 79.02, functions: 89.74, lines: 87.5 },
    },
  },
});
