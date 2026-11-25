import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "analyze"
      ? [
          visualizer({
            filename: "bundle-stats.html",
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }),
        ]
      : []),
  ],
  build: {
    rollupOptions: {
      input: {
        app: resolve(root, "index.html"),
        widget: resolve(root, "src/widget.tsx"),
      },
      output: {
        entryFileNames: "assets/[name].js",
      },
    },
  },
}));
