import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

// Tauri uses a fixed dev port and never opens a browser tab by itself.
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**", "**/target/**"] },
  },
  publicDir: "assets",
  build: { target: "es2022", outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
