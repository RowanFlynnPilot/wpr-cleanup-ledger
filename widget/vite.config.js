import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// publicDir points at the repo-level public/ so the widget serves and ships
// the same data/*.json the pipeline commits — no copy step, dev == prod.
export default defineConfig({
  base: "/wpr-cleanup-ledger/",
  publicDir: "../public",
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
