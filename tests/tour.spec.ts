import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Página pública do empreendimento (issue #43). O corretor de sessão monta um
// prédio; o banco o publica; a página é aberta logado (como o dono) e anônimo.

test.describe("Tour público /e/[slug]", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("abre publicado sem login, nunca mostra 'sob consulta' e some se não publicado", async ({
    page,
    browser,
  }, testInfo) => {
    const name = `Tour ${Date.now()} ${testInfo.project.name}`;
    const id = await createBuilding(page, name);
    await page.getByRole("button", { name: "Gerar 24 unidades" }).click();
    await expect(page.getByText("24 unidades criadas.")).toBeVisible({
      timeout: 30_000,
    });
    runSql(
      `update public.unidades set preco = 450000, exibir_preco = true where empreendimento_id = '${id}' and numero = '101';
       update public.unidades set preco = 777777, exibir_preco = false where empreendimento_id = '${id}' and numero = '102';
       update public.unidades set status = 'vendido' where empreendimento_id = '${id}' and numero = '103';
       update public.empreendimentos set status = 'publicado', construtora = 'Construtora Exemplo' where id = '${id}';`,
    );
    const [{ slug }] = querySql<{ slug: string }>(
      `select slug from public.empreendimentos where id = '${id}'`,
    );
    const url = `/e/${slug}`;

    // Logado como o dono: a página consulta como visitante (cliente anônimo).
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByTestId("tour-from-price")).toHaveText(/450\.000,00/);
    await expect(page.getByTestId("tour-status")).toContainText("1 vendida");
    await expect(page.getByTestId("tour-safety")).toContainText(
      "Construtora Exemplo",
    );
    await expect(page.getByTestId("tour-safety")).toContainText(
      "Pronto para morar",
    );
    expect(await page.content()).not.toMatch(/777[.,]?777/);

    // Visitante sem login.
    // Same device as the project (iPhone 13 on "celular"), without the login.
    const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
      testInfo.project.use;
    const visitor = await browser.newContext({
      viewport,
      userAgent,
      deviceScaleFactor,
      isMobile,
      hasTouch,
    });
    const anon = await visitor.newPage();
    const response = await anon.goto(url);
    expect(response?.status()).toBe(200);
    await expect(anon.getByRole("heading", { level: 1, name })).toBeVisible();
    expect(await anon.content()).not.toMatch(/777[.,]?777/);

    // Prédio 3D (#44): tocar no meio do prédio escolhe uma unidade real.
    const canvas = anon.getByTestId("tour-building-3d").locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    const selectedUnit = anon.getByTestId("tour-selected-unit");
    await expect(async () => {
      if (testInfo.project.name === "celular") await canvas.tap();
      else await canvas.click();
      await expect(selectedUnit).toContainText(/Unidade \d{3}/, {
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
    await expect(selectedUnit).toContainText(
      /andar · (Disponível|Reservado|Vendido)/,
    );

    // Rascunho, arquivado e slug inexistente: 404.
    for (const status of ["rascunho", "arquivado"]) {
      runSql(
        `update public.empreendimentos set status = '${status}' where id = '${id}'`,
      );
      expect((await anon.goto(url))?.status(), status).toBe(404);
    }
    expect((await anon.goto("/e/nao-existe-este-link"))?.status()).toBe(404);
    await visitor.close();
  });
});
