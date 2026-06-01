import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootPkg = JSON.parse(readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __CASTLE_VERSION__: JSON.stringify(rootPkg.version ?? "0.0.0"),
  },
  resolve: {
    alias: {
      "butter/dialog": fileURLToPath(new URL("./src/dbm/butterdialog.ts", import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mantine: [
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/form",
            "@mantine/modals",
            "@mantine/notifications",
            "@mantine/code-highlight",
          ],
          router: ["@tanstack/react-router", "@tanstack/react-query"],
          codemirror: [
            "codemirror",
            "@codemirror/autocomplete",
            "@codemirror/commands",
            "@codemirror/lang-sql",
            "@codemirror/language",
            "@codemirror/search",
            "@codemirror/state",
            "@codemirror/view",
            "@replit/codemirror-vim",
            "sql-formatter",
          ],
          xterm: ["@xterm/xterm", "@xterm/addon-fit"],
          icons: ["lucide-react"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4280",
    },
  },
});
