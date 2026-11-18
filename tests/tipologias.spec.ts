import { expect, type Page } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Tipologias (issue #31). Usa o corretor já logado do tests/global-setup.ts.

async function fillTypology(
  page: Page,
  values: { name: string; bedrooms?: string; area?: string },
) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome").fill(values.name);
  if (values.bedrooms) await dialog.getByLabel("Quartos").fill(values.bedrooms);
  if (values.area !== undefined)
    await dialog.getByLabel("Área privativa (m²)").fill(values.area);
  return dialog;
}

const item = (page: Page, name: string) =>
  page
    .getByTestId("typology-item")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

test.describe("Tipologias", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(120_000);

  test("cria, duplica (com os cômodos), edita e exclui", async ({
    page,
  }, testInfo) => {
    const projectId = await createBuilding(
      page,
      `Tipologias ${Date.now()} ${testInfo.project.name}`,
    );

    // Cria "Tipo A": 2 quartos, 65,5 m².
    await page.getByRole("button", { name: "Nova tipologia" }).click();
    const dialog = await fillTypology(page, {
      name: "Tipo A",
      bedrooms: "2",
      area: "65,5",
    });
    await dialog.getByRole("button", { name: "Criar tipologia" }).click();
    await expect(page.getByText("Tipologia criada.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(item(page, "Tipo A")).toContainText("2 quartos");
    await expect(item(page, "Tipo A")).toContainText("65,5 m²");

    // Um cômodo direto no banco (a tela de cômodos é a próxima issue).
    const [{ id: typologyId }] = querySql<{ id: string }>(
      `select id from public.tipologias where empreendimento_id = '${projectId}' and nome = 'Tipo A'`,
    );
    runSql(
      `insert into public.comodos (tipologia_id, nome, tipo, geometria, area_m2) values ('${typologyId}', 'Sala', 'sala', '{"tipo":"poligono","pontos":[[0,0],[5,0],[5,4],[0,4]],"pe_direito":2.7}', 20)`,
    );
    await page.reload();
    await expect(item(page, "Tipo A")).toContainText("1 cômodo");

    // Nome repetido mostra erro no campo.
    await page.getByRole("button", { name: "Nova tipologia" }).click();
    await (
      await fillTypology(page, { name: "Tipo A" })
    )
      .getByRole("button", { name: "Criar tipologia" })
      .click();
    await expect(page.getByTestId("typology-name-error")).toContainText(
      "Já existe",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancelar" })
      .click();

    // Duplica: a cópia leva o cômodo junto.
    await item(page, "Tipo A")
      .getByRole("button", { name: "Duplicar" })
      .click();
    await expect(item(page, "Tipo A (cópia)")).toContainText("1 cômodo", {
      timeout: 15_000,
    });

    // Edita a cópia para "Tipo B", 3 quartos.
    await item(page, "Tipo A (cópia)")
      .getByRole("button", { name: "Editar" })
      .click();
    await expect(page.getByRole("dialog").getByLabel("Nome")).toHaveValue(
      "Tipo A (cópia)",
    );
    await (
      await fillTypology(page, { name: "Tipo B", bedrooms: "3" })
    )
      .getByRole("button", { name: "Salvar" })
      .click();
    await expect(item(page, "Tipo B")).toContainText("3 quartos", {
      timeout: 15_000,
    });

    // Exclui a "Tipo B"; a "Tipo A" continua.
    await item(page, "Tipo B").getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("button", { name: "Excluir tipologia" }).click();
    await expect(page.getByText("Tipologia excluída.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(item(page, "Tipo B")).toHaveCount(0);
    await expect(item(page, "Tipo A")).toBeVisible();
  });
});
