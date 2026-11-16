import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Testes de navegador (e2e): abrem o site de verdade, em desktop e celular.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // no CI, um test.only esquecido falha o build
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry", // grava um "replay" quando um teste falha e é repetido
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // iPhone 13 = 390 px de largura, Safari (WebKit), toque.
      name: "celular",
      use: { ...devices["iPhone 13"] },
    },
  ],
  // Sobe o site sozinho antes dos testes (ou reaproveita um `npm run dev` já aberto).
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
