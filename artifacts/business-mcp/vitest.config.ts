import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Vitest (vite) can't follow the "workspace" export condition in
      // @workspace/db. Point it directly at the TypeScript source so
      // vi.mock('@workspace/db', ...) works without a compiled dist.
      "@workspace/db": path.resolve(__dirname, "../../lib/db/src/index.ts"),
    },
  },
  test: {
    pool: "forks",
    include: ["src/**/*.test.ts"],
  },
});
