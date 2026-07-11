import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/supabase": {
        target: "https://ieijkjjyfgnnypfmieij.backend.onspace.ai",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/supabase/, ""),
      },
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
