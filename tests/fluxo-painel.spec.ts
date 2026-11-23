import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { bigPhoto, createBuilding, hasSupabaseEnv } from "./fixtures";

// Issue #34: o fluxo inteiro do corretor, do cadastro à publicação, com
// revisão de acessibilidade automática (axe, regras WCAG 2 A/AA) em cada tela
// e nenhum erro no console. Cria uma conta nova de verdade
// (e2e-...@exemplo.test, apagada no fim pelo tests/global-teardown.ts).

/**
 * Roda o axe na tela atual. expect.soft: o problema fica no relatório mesmo
 * que um passo seguinte do fluxo falhe, e o teste continua.
 */
async function checkA11y(page: Page, where: string) {
  // Measure the final colors: a dialog fading in (or a button's hover
  // transition) is still semi-transparent and fails contrast by chance.
  await page.waitForFunction(
    () =>
      document.getAnimations().every(
        (a) =>
          a.playState !== "running" ||
          // Spinners loop forever: never "done", and don't affect text.
          a.effect?.getComputedTiming().iterations === Infinity,
      ),
    undefined,
    { timeout: 5_000 },
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    // Toasts are measured mid-animation (still transparent): false positive.
    .exclude("[data-sonner-toaster]")
    .analyze();
  const found = result.violations.map(
    (v) =>
      `${v.id} (${v.impact}) – ${v.help} – ${v.nodes
        .slice(0, 3)
        .map(
          (n) =>
            `${n.target.join(" ")} ${n.html.slice(0, 160)} ${n.any[0]?.message ?? ""}`,
        )
        .join(" | ")}`,
  );
  expect.soft(found, `acessibilidade (axe) em: ${where}`).toEqual([]);
}

test.describe("Fluxo completo do painel", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(240_000);

  test("cadastro → perfil → prédio → capa → tipologia com cômodo → unidades → publicar", async ({
    page,
  }, testInfo) => {
    const started = Date.now();
    const consoleErrors: string[] = [];
    page.on(
      "console",
      (m) => m.type() === "error" && consoleErrors.push(m.text()),
    );
    page.on("pageerror", (e) => consoleErrors.push(e.message));

    // 1) Conta nova.
    await page.goto("/cadastro");
    await checkA11y(page, "cadastro");
    await page.getByLabel("Seu nome").fill("Corretora Fluxo");
    await page
      .getByLabel("E-mail")
      .fill(`e2e-fluxo-${Date.now()}-${testInfo.project.name}@exemplo.test`);
    await page.getByLabel("Senha").fill("senha-de-teste-123");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/painel$/, { timeout: 30_000 });
    await checkA11y(page, "painel vazio");

    // 2) Perfil com WhatsApp.
    await page.getByRole("link", { name: "Meu perfil" }).click();
    await expect(page.getByRole("heading", { name: "Meu perfil" })).toBeVisible(
      {
        timeout: 30_000,
      },
    );
    await page.getByLabel("WhatsApp").fill("11 98888 7777");
    await page.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(page.getByText("Perfil salvo.")).toBeVisible({
      timeout: 15_000,
    });
    await checkA11y(page, "perfil");

    // 3) Prédio (6 andares × 4) e 4) capa.
    const name = `Residencial Fluxo ${Date.now()} ${testInfo.project.name}`;
    await createBuilding(page, name);
    await checkA11y(page, "edição do empreendimento");
    await page.locator("#cover").setInputFiles(await bigPhoto(page, 210));
    await expect(page.getByText("Capa salva.")).toBeVisible({
      timeout: 30_000,
    });

    // 5) Tipologia com um cômodo.
    await page.getByRole("button", { name: "Nova tipologia" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome").fill("Tipo A");
    await dialog.getByLabel("Área privativa (m²)").fill("65");
    await checkA11y(page, "janela de tipologia");
    await dialog.getByRole("button", { name: "Criar tipologia" }).click();
    await expect(page.getByText("Tipologia criada.")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("link", { name: "Cômodos" }).click();
    const form = page.getByRole("form");
    await expect(form).toBeVisible({ timeout: 30_000 });
    await form.getByLabel("Nome").fill("Sala");
    await form.getByLabel("Largura (m)").fill("5");
    await form.getByLabel("Profundidade (m)").fill("4");
    await checkA11y(page, "cômodos");
    await form.getByRole("button", { name: "Adicionar cômodo" }).click();
    await expect(page.getByText("Cômodo criado.")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("link", { name: `← ${name}` }).click();

    // 6) Unidades: gera, aplica tipologia e preço em todas, mostra o preço.
    await page.getByRole("button", { name: "Gerar 24 unidades" }).click();
    await expect(page.getByText("24 unidades criadas.")).toBeVisible({
      timeout: 30_000,
    });
    const bulk = page.getByTestId("bulk-bar");
    await bulk.getByRole("button", { name: "Todas" }).click();
    await bulk
      .getByLabel("Tipologia para as selecionadas")
      .selectOption({ label: "Tipo A" });
    await bulk.getByRole("button", { name: "Aplicar tipologia" }).click();
    await expect(page.getByText("24 unidades atualizadas.")).toBeVisible({
      timeout: 30_000,
    });
    await bulk.getByLabel("Preço para as selecionadas").fill("450.000");
    await bulk.getByRole("button", { name: "Aplicar preço" }).click();
    await expect(
      page.getByLabel("Preço da Unidade 101", { exact: true }),
    ).toHaveValue(/450\.000/, {
      timeout: 30_000,
    });
    await checkA11y(page, "unidades");

    // 7) Publicar: o checklist está completo.
    const panel = page.getByTestId("publish-panel");
    await expect(panel.getByRole("button", { name: "Publicar" })).toBeEnabled({
      timeout: 30_000,
    });
    await panel.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Publicado! O link já funciona")).toBeVisible({
      timeout: 15_000,
    });
    await expect(panel.getByText("Publicado", { exact: true })).toBeVisible();

    testInfo.annotations.push({
      type: "duração do fluxo automático",
      description: `${Math.round((Date.now() - started) / 1000)} s`,
    });
    expect(consoleErrors, "erros no console").toEqual([]);
  });
});
