import { defineConfig } from "vitest/config";

// Testes unitários e de componente (rodam no Node com um DOM simulado, o jsdom).
// Testes de navegador de verdade ficam em tests/ e rodam com o Playwright.
export default defineConfig({
  resolve: {
    tsconfigPaths: true, // entende o alias "@/..." do tsconfig.json
  },
  oxc: {
    jsx: { runtime: "automatic" }, // JSX sem precisar importar React
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
