import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(rootDir, "demo"),
  base: "/job-compass/",
  publicDir: path.join(rootDir, "public"),
  plugins: [react()],
  resolve: {
    alias: { "@": rootDir },
  },
  build: {
    outDir: path.join(rootDir, "dist-pages"),
    emptyOutDir: true,
  },
});
