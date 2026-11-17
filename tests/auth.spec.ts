import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

// Login do corretor (issue #18). Precisa do .env.local com o Supabase.
// O cadastro cria usuários reais no projeto de desenvolvimento com e-mails
// e2e-...@exemplo.test; o tests/global-teardown.ts apaga esses usuários no fim.
const hasSupabaseEnv =
  existsSync(".env.local") ||
  (!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

test.describe("Login do corretor", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");

  test("painel sem login manda para /entrar", async ({ page }) => {
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("formulário vazio mostra os erros de validação", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
    await expect(page.getByText("Informe a senha.")).toBeVisible();
  });

  test("senha errada mostra mensagem genérica (não revela se o e-mail existe)", async ({
    page,
  }) => {
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill("naoexiste@exemplo.test");
    await page.getByLabel("Senha").fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    // (Não usar getByRole("alert"): o Next.js tem um anunciador de rotas com esse papel.)
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test("cadastro → painel → sair → painel bloqueado → entrar de novo", async ({
    page,
  }, testInfo) => {
    const email = `e2e-${Date.now()}-${testInfo.project.name}@exemplo.test`;
    const password = "senha-de-teste-123";

    await page.goto("/cadastro");
    await page.getByLabel("Seu nome").fill("Teste Automatizado");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/painel$/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Olá, Teste" }),
    ).toBeVisible();

    // Logado, /entrar volta para o painel.
    await page.goto("/entrar");
    await expect(page).toHaveURL(/\/painel$/);

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar$/);

    await page.goto("/painel");
    await expect(page).toHaveURL(/\/entrar$/);

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/painel$/, { timeout: 20_000 });
  });
});
