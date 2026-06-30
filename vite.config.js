import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    port: 5173,
    proxy: {
      // Forward AI extraction calls to the Express backend (npm run server)
      "/api": "http://localhost:8787",
    },
  },
});
