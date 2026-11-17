import { existsSync } from "node:fs";

import { expect, type Page, test } from "@playwright/test";

// Perfil do corretor (issue #19). Cria um usuário de teste (e2e-...@exemplo.test),
// apagado no fim pelo tests/global-teardown.ts.
const hasSupabaseEnv =
  existsSync(".env.local") ||
  (!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function signUpAndOpenProfile(page: Page, suffix: string) {
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Perfil Teste");
  await page
    .getByLabel("E-mail")
    .fill(`e2e-perfil-${Date.now()}-${suffix}@exemplo.test`);
  await page.getByLabel("Senha").fill("senha-de-teste-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/painel$/, { timeout: 20_000 });
  await page.getByRole("link", { name: "Meu perfil" }).click();
  await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
}

test.describe("Perfil do corretor", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");

  test("edita, salva e os dados continuam depois de recarregar", async ({
    page,
  }, testInfo) => {
    await signUpAndOpenProfile(page, testInfo.project.name);

    await page.getByLabel("Nome").fill("Ana Corretora");
    await page.getByLabel("WhatsApp").fill("11 98888 7777");
    await page.getByLabel("CRECI").fill("CRECI-SP 123456");
    await page.locator("#brandColor").fill("#7A1F3D");
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    await expect(page.getByText("Perfil salvo.")).toBeVisible();
    // O número aparece no formato de leitura (salvo em E.164 no banco).
    await expect(page.getByLabel("WhatsApp")).toHaveValue("(11) 98888-7777");

    await page.reload();
    await expect(page.getByLabel("Nome")).toHaveValue("Ana Corretora");
    await expect(page.getByLabel("WhatsApp")).toHaveValue("(11) 98888-7777");
    await expect(page.getByLabel("CRECI")).toHaveValue("CRECI-SP 123456");
    await expect(page.locator("#brandColor")).toHaveValue("#7a1f3d");
    await expect(page.getByTestId("brand-preview")).toHaveCSS(
      "background-color",
      "rgb(122, 31, 61)",
    );
  });

  test("salva com WhatsApp e CRECI em branco (perfil de quem acabou de criar a conta)", async ({
    page,
  }, testInfo) => {
    await signUpAndOpenProfile(page, `${testInfo.project.name}-vazios`);

    await expect(page.getByLabel("WhatsApp")).toHaveValue("");
    await expect(page.getByLabel("CRECI")).toHaveValue("");
    await page.getByLabel("Nome").fill("Corretor Sem Creci");
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    await expect(page.getByText("Perfil salvo.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nome")).toHaveValue("Corretor Sem Creci");
    await expect(page.getByLabel("WhatsApp")).toHaveValue("");
  });

  test("o seletor de cor e o campo de texto ficam iguais", async ({
    page,
  }, testInfo) => {
    await signUpAndOpenProfile(page, `${testInfo.project.name}-cor`);

    await page.getByLabel("Escolher a cor").fill("#aa3322");
    await expect(page.locator("#brandColor")).toHaveValue("#aa3322");
    await expect(page.getByTestId("brand-preview")).toHaveCSS(
      "background-color",
      "rgb(170, 51, 34)",
    );
  });

  test("WhatsApp inválido mostra o erro no campo e não salva", async ({
    page,
  }, testInfo) => {
    await signUpAndOpenProfile(page, `${testInfo.project.name}-invalido`);

    await page.getByLabel("WhatsApp").fill("9999-9999");
    await page.getByRole("button", { name: "Salvar perfil" }).click();

    await expect(page.getByTestId("whatsapp-error")).toContainText("DDD");
    await expect(page.getByText("Perfil salvo.")).toHaveCount(0);
  });
});
