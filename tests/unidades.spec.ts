import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  publicSupabase,
  querySql,
  runSql,
} from "./fixtures";

// Unidades em grade, preço e status (issue #33). O prédio de teste tem
// 6 andares × 4 unidades = 24 unidades (101 a 604).

test.describe("Unidades: grade, edição em lote e sob consulta", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(180_000);

  test("gera sem duplicar, aplica por coluna, sob consulta e reduz o prédio", async ({
    page,
    request,
  }, testInfo) => {
    const projectId = await createBuilding(
      page,
      `Unidades ${Date.now()} ${testInfo.project.name}`,
    );
    runSql(
      `insert into public.tipologias (empreendimento_id, nome, quartos) values ('${projectId}', 'Tipo A', 2), ('${projectId}', 'Tipo B', 3)`,
    );
    await page.reload();
    const countUnits = (where = "true") =>
      Number(
        querySql<{ n: number }>(
          `select count(*) as n from public.unidades where empreendimento_id = '${projectId}' and ${where}`,
        )[0].n,
      );

    // Gera as 24; gerar de novo não duplica.
    await page.getByRole("button", { name: "Gerar 24 unidades" }).click();
    await expect(page.getByText("24 unidades criadas.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId("units-table").locator("tbody tr[data-testid^='unit-']"),
    ).toHaveCount(24);
    await page
      .getByRole("button", { name: "Gerar unidades que faltam" })
      .click();
    await expect(page.getByText("Todas as unidades já existiam.")).toBeVisible({
      timeout: 30_000,
    });
    expect(countUnits()).toBe(24);

    // Tipo B em todas as finais 01 e 04: poucos cliques.
    const bulk = page.getByTestId("bulk-bar");
    await bulk.getByRole("button", { name: "01", exact: true }).click();
    await bulk.getByRole("button", { name: "04", exact: true }).click();
    await expect(bulk).toContainText("12 selecionadas");
    await bulk
      .getByLabel("Tipologia para as selecionadas")
      .selectOption({ label: "Tipo B" });
    await bulk.getByRole("button", { name: "Aplicar tipologia" }).click();
    await expect(page.getByText("12 unidades atualizadas.")).toBeVisible({
      timeout: 30_000,
    });
    const [{ id: typeB }] = querySql<{ id: string }>(
      `select id from public.tipologias where empreendimento_id = '${projectId}' and nome = 'Tipo B'`,
    );
    expect(countUnits(`tipologia_id = '${typeB}'`)).toBe(12);
    await expect(page.getByLabel("Tipologia da Unidade 104")).toHaveValue(
      typeB,
    );

    // Preço em todas e "mostrar preço"; depois a cobertura (6º andar) sob consulta.
    await bulk.getByRole("button", { name: "Limpar" }).click();
    await bulk.getByRole("button", { name: "Todas" }).click();
    await bulk.getByLabel("Preço para as selecionadas").fill("R$ 450.000,00");
    await bulk.getByRole("button", { name: "Aplicar preço" }).click();
    await expect(page.getByText("24 unidades atualizadas.")).toBeVisible({
      timeout: 30_000,
    });
    await bulk.getByRole("button", { name: "Mostrar preço" }).click();
    await expect(page.getByLabel("Mostrar o preço da Unidade 101")).toBeChecked(
      {
        timeout: 30_000,
      },
    );
    await bulk.getByRole("button", { name: "Limpar" }).click();
    for (const n of ["601", "602", "603", "604"])
      await page.getByLabel(`Selecionar Unidade ${n}`).check();
    await bulk.getByRole("button", { name: "Sob consulta" }).click();
    await expect(
      page.getByLabel("Mostrar o preço da Unidade 601"),
    ).not.toBeChecked({
      timeout: 30_000,
    });
    expect(countUnits("preco = 450000")).toBe(24);
    expect(countUnits("exibir_preco = false")).toBe(4);

    // Status de uma unidade muda o mini prédio.
    await page.getByLabel("Status da Unidade 101").selectOption("vendido");
    await expect(page.getByTestId("status-summary")).toContainText(
      "1 vendida",
      {
        timeout: 30_000,
      },
    );

    // Visitante (API pública): "sob consulta" continua sem preço.
    runSql(
      `update public.empreendimentos set status = 'publicado' where id = '${projectId}'`,
    );
    const { url, key } = publicSupabase();
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const visible = await request.get(
      `${url}/rest/v1/unidades?select=numero,preco_publico&empreendimento_id=eq.${projectId}&numero=in.(101,601)`,
      { headers },
    );
    expect(visible.ok()).toBe(true);
    const rows = (await visible.json()) as {
      numero: string;
      preco_publico: number | null;
    }[];
    expect(rows.find((r) => r.numero === "101")?.preco_publico).toBe(450000);
    expect(rows.find((r) => r.numero === "601")?.preco_publico).toBeNull();
    const hidden = await request.get(
      `${url}/rest/v1/unidades?select=preco&empreendimento_id=eq.${projectId}`,
      { headers },
    );
    expect(hidden.ok()).toBe(false); // a coluna preco nunca vai para o visitante
    runSql(
      `update public.empreendimentos set status = 'rascunho' where id = '${projectId}'`,
    );

    // O prédio diminuiu para 5 andares: as 4 unidades do 6º ficam fora.
    runSql(
      `update public.empreendimentos set numero_andares = 5 where id = '${projectId}'`,
    );
    await page.reload();
    await expect(page.getByText("estão fora do tamanho atual")).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole("button", { name: "Remover as que estão fora" })
      .click();
    await expect(page.getByText("4 unidades removidas.")).toBeVisible({
      timeout: 30_000,
    });
    expect(countUnits()).toBe(20);
  });
});
