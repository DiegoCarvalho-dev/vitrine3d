import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

// Sem credenciais do Supabase (ex.: máquina nova ou CI sem segredos), o teste é pulado.
const hasSupabaseEnv =
  existsSync(".env.local") ||
  (!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

test.describe("Lab: Supabase", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");

  test("lê a tabela saude e mostra conectado", async ({ page }) => {
    await page.goto("/lab/supabase");

    await expect(page.getByRole("status")).toContainText("conectado");
    // Procura o NOSSO aviso de erro. (Não usar getByRole("alert"): o Next.js
    // coloca um anunciador de rotas vazio com role="alert" na página.)
    await expect(page.getByText("Não foi possível ler o banco")).toHaveCount(0);
  });
});
