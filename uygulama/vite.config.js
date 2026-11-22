import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-kurulum.js",
    // Veritabanı testleri (supabase/testler) Node'un kendi test aracıyla çalışır: npm run test:db
    include: ["src/**/*.test.{js,jsx}"],
    testTimeout: 20000,
  },
});
