import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Vitest does not populate process.env from .env files, but one test in
  // lib/__tests__/platform.test.ts talks to the database. Loading the file
  // here keeps the suite deterministic instead of depending on the shell
  // that happens to export DATABASE_URL.
  const env = loadEnv(mode, path.resolve(__dirname, "."), "");

  return {
    test: {
      environment: "node",
      include: ["lib/**/__tests__/**/*.test.ts", "tests/**/*.test.ts"],
      env,
    },
    resolve: {
      alias: { "@": path.resolve(__dirname, "./") },
    },
  };
});
