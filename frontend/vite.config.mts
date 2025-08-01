import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import Terminal from "vite-plugin-terminal";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    react(),
    mode === "development" &&
      Terminal({
        console: "terminal",
        output: ["console", "terminal"],
      }),
  ].filter(Boolean), // removes false/null entries
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
