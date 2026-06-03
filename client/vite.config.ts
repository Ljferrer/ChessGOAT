/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite + Vitest config for the ChessGOAT client.
// Dev server runs on :5173 (per plans/PLAN.md); the future backend serves :8000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/engines/**", "src/game/**"],
      reporter: ["text", "html"],
    },
  },
});
