import { expect, type Page } from "@playwright/test";

import { hasSupabaseEnv, loggedInTest as test } from "./fixtures";

// Empreendimentos no painel (issue #28). Usa o corretor já logado do
// tests/global-setup.ts (sem cadastro por teste, por causa do limite de
// cadastros do Supabase). Os empreendimentos somem junto com o usuário no
// global-teardown (cascata).

// Empreendimento do seed (Residencial Demo), publicado e de OUTRA corretora.
const DEMO_PROJECT_ID = "0d3e0000-0000-4000-8000-000000000010";
const EDIT_URL = /\/painel\/empreendimentos\/[0-9a-f-]{36}$/;

/**
 * Digita o nome até o link aparecer: prova que o formulário já está ativo
 * (no celular, digitar antes do React carregar some quando a página "acorda").
 */
async function fillName(page: Page, name: string) {
  await expect(async () => {
    await page.getByLabel("Nome do empreendimento").fill(name);
    await expect(page.getByTestId("slug-preview")).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 15_000 });
}

test.describe("Empreendimentos no painel", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");

  test("cria um prédio, cai na edição e ele aparece na lista em rascunho", async ({
    page,
  }, testInfo) => {
    const name = `Edifício Teste ${Date.now()} ${testInfo.project.name}`;
    await page.goto("/painel");
    await page.getByRole("link", { name: "Novo empreendimento" }).click();
    await fillName(page, name);
    // O link é gerado a partir do nome.
    await expect(page.getByTestId("slug-preview")).toContainText(
      "/e/edificio-teste-",
    );
    await page.getByLabel("Cidade").fill("São Paulo");
    await page.getByLabel("UF").selectOption("SP");
    await page.getByLabel("Andares", { exact: true }).fill("8");
    await page.getByLabel("Unidades por andar", { exact: true }).fill("4");
    await page.getByRole("button", { name: "Criar empreendimento" }).click();

    await expect(page).toHaveURL(EDIT_URL, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name })).toBeVisible();
    // Bug pego no teste visual: o redirect era tratado como falha de conexão.
    // Provar que algo NÃO aparece: dá tempo ao aviso entrar e conta NA HORA
    // (toHaveCount(0) esperaria o aviso sumir sozinho em 4 s e passaria).
    await page.waitForTimeout(1_500);
    expect(await page.locator("[data-sonner-toast]").count()).toBe(0);
    await expect(page.getByText("Rascunho")).toBeVisible();
    await expect(page.getByLabel("Andares", { exact: true })).toHaveValue("8");
    await expect(
      page.getByLabel("Unidades por andar", { exact: true }),
    ).toHaveValue("4");

    await page.getByRole("link", { name: "← Meus empreendimentos" }).click();
    const card = page
      .getByTestId("project-list")
      .getByRole("link")
      .filter({ hasText: name });
    await expect(card).toBeVisible();
    await expect(card.getByText("Rascunho")).toBeVisible();
  });

  test("link repetido mostra erro no campo", async ({ page }, testInfo) => {
    const name = `Torre Repetida ${Date.now()} ${testInfo.project.name}`;

    await page.goto("/painel");
    for (let attempt = 0; attempt < 2; attempt++) {
      // Entra pelo botão, como o corretor faz.
      await page.getByRole("link", { name: "Novo empreendimento" }).click();
      await expect(page).toHaveURL(/\/novo$/);
      await fillName(page, name);
      await page.getByLabel("Cidade").fill("Campinas");
      await page.getByLabel("Andares", { exact: true }).fill("5");
      await page.getByLabel("Unidades por andar", { exact: true }).fill("2");
      await page.getByRole("button", { name: "Criar empreendimento" }).click();
      if (attempt === 0) {
        await expect(page).toHaveURL(EDIT_URL, { timeout: 20_000 });
        await page
          .getByRole("link", { name: "← Meus empreendimentos" })
          .click();
      }
    }

    await expect(page.getByTestId("slug-error")).toHaveText(
      "Esse link já está em uso. Escolha outro.",
    );
    await expect(page).toHaveURL(/\/novo$/);
  });

  test("casa não pede andares nem unidades por andar", async ({ page }) => {
    await page.goto("/painel/empreendimentos/novo");
    await expect(page.getByLabel("Andares", { exact: true })).toBeVisible();
    await page.getByText("Casa", { exact: true }).click();
    await expect(page.getByLabel("Andares", { exact: true })).toHaveCount(0);
  });

  test("não mostra nem abre empreendimento de outro corretor (nem publicado)", async ({
    page,
  }) => {
    // O Residencial Demo é publicado: o RLS deixa um logado lê-lo, mas o painel
    // filtra pelo dono.
    await page.goto("/painel");
    await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();
    await expect(page.getByText("Residencial Demo")).toHaveCount(0);

    const response = await page.goto(
      `/painel/empreendimentos/${DEMO_PROJECT_ID}`,
    );
    expect(response?.status()).toBe(404);
  });
});
