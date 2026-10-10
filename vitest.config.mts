import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["tests/**/*.test.{ts,mjs}"], env: { NEXT_PUBLIC_TIMEZONE: "America/New_York" } },
});
