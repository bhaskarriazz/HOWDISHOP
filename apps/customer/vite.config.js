import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Multi-page build: the customer app (index.html) and the standalone Learn & Earn page (learn-earn.html)
// are both emitted to dist/.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        learn: fileURLToPath(new URL("./learn-earn.html", import.meta.url)),
      },
    },
  },
});
