import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const cdnOutDir = env.ENDFIELDIZE_CDN_OUT_DIR;

  return {
    base: env.ENDFIELDIZE_CDN_BASE || "/",
    ...(cdnOutDir ? { build: { outDir: cdnOutDir } } : {}),
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
    },
  };
});
