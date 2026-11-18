import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Testes de navegador (e2e): abrem o site de verdade, em desktop e celular.
export default defineConfig({
  testDir: "./tests",
  // Apaga os usuários criados pelo teste de cadastro (tests/auth.spec.ts).
  // Cria um corretor já logado por projeto (tests/global-setup.ts).
  globalSetup: "./tests/global-setup.ts",
  globalTeardown: "./tests/global-teardown.ts",
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
  // Por padrão testa o site COMPILADO (build + start): responde bem mais
  // rápido que o servidor de dev, que compila cada página na primeira visita.
  // Com E2E_DEV=1, usa o `npm run dev` (ou reaproveita um já aberto).
  webServer: {
    command: process.env.E2E_DEV
      ? "npm run dev"
      : "npm run build && npm run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000, // o build leva de 1 a 2 minutos
  },
});
