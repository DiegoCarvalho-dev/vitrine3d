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

    // Prévia do WhatsApp (#47): título, "a partir de" público e imagem gerada.
    const meta = (property: string) =>
      anon.locator(`meta[property="${property}"]`).getAttribute("content");
    expect(await meta("og:title")).toContain(name);
    expect(await meta("og:description")).toContain("A partir de R$");
    expect(await meta("og:description")).toMatch(/450\.000,00/);
    expect(await meta("og:description")).not.toMatch(/777[.,]?777/);
    const image = (await meta("og:image"))!;
    expect(image).toMatch(/^https?:\/\/.+\/og$/);
    const generated = await anon.request.get(new URL(image).pathname);
    expect(generated.status()).toBe(200);
    expect(generated.headers()["content-type"]).toContain("image/png");

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
    // Sem mouse/toque (teclado, leitor de tela): a lista escolhe a mesma coisa.
    await anon
      .getByLabel("Escolher unidade", { exact: true })
      .selectOption("103");
    await expect(selectedUnit).toContainText(
      "Unidade 103 · 1º andar · Vendido",
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

// Filtros do tour (issue #45). Prédio de 6 andares × 4 montado direto no banco:
// finais 01 e 04 = Tipo B (3 quartos), 02 e 03 = Tipo A (2 quartos); o andar n
// custa n × R$ 100 mil; o 6º andar é "sob consulta"; a 101 está vendida.
test.describe("Filtros do tour", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("filtra, mostra o contador, vale pelo link e limpa", async ({
    page,
    browser,
  }, testInfo) => {
    const id = await createBuilding(
      page,
      `Filtros ${Date.now()} ${testInfo.project.name}`,
    );
    runSql(
      `insert into public.tipologias (empreendimento_id, nome, quartos) values ('${id}', 'Tipo A', 2), ('${id}', 'Tipo B', 3)`,
    );
    const types = querySql<{ id: string; nome: string }>(
      `select id, nome from public.tipologias where empreendimento_id = '${id}'`,
    );
    const typeA = types.find((t) => t.nome === "Tipo A")!.id;
    const typeB = types.find((t) => t.nome === "Tipo B")!.id;
    runSql(
      `insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar, tipologia_id, preco, exibir_preco)
         select '${id}', f, (f * 100 + p)::text, p, case when p in (1, 4) then '${typeB}'::uuid else '${typeA}'::uuid end, f * 100000, f <> 6
         from generate_series(1, 6) f, generate_series(1, 4) p;
       update public.unidades set status = 'vendido' where empreendimento_id = '${id}' and numero = '101';
       update public.empreendimentos set status = 'publicado' where id = '${id}'`,
    );
    const [{ slug }] = querySql<{ slug: string }>(
      `select slug from public.empreendimentos where id = '${id}'`,
    );

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
    const found = anon.getByTestId("tour-found");

    await anon.goto(`/e/${slug}`);
    await expect(found).toHaveText("24 unidades encontradas");
    // The counter is already in the HTML; wait for the page to be interactive.
    await expect(
      anon.getByTestId("tour-building-3d").locator("canvas"),
    ).toBeVisible({ timeout: 30_000 });

    // No celular os filtros ficam numa gaveta.
    const openFilters = anon.getByRole("button", { name: /^Filtros/ });
    if (isMobile) await openFilters.click();

    // 3 quartos (finais 01 e 04): 12 unidades.
    await anon.getByLabel("Quartos").selectOption("3");
    await expect(found).toHaveText("12 unidades encontradas");

    // Até R$ 300 mil: andares 1 a 3 (6) + os 2 do 6º andar "sob consulta" = 8.
    await anon.getByLabel("Preço até").fill("300000");
    await expect(found).toHaveText("8 unidades encontradas");
    await expect(anon.getByTestId("tour-price-note")).toContainText(
      "sob consulta",
    );

    // Só disponíveis tira a 101 (vendida): 7.
    await anon.getByLabel("Só disponíveis").check();
    await expect(found).toHaveText("7 unidades encontradas");
    expect(new URL(anon.url()).search).toBe(
      "?quartos=3&ate=300000&disponiveis=1",
    );

    // O mesmo link, aberto do zero, já vem filtrado.
    const shared = await visitor.newPage();
    await shared.goto(`/e/${slug}?quartos=3&ate=300000&disponiveis=1`);
    await expect(shared.getByTestId("tour-found")).toHaveText(
      "7 unidades encontradas",
    );
    await shared.close();

    // Link com lixo é ignorado, sem quebrar a página.
    const junk = await visitor.newPage();
    expect(
      (
        await junk.goto(`/e/${slug}?quartos=abc&ate=-1&andar_de=999999`)
      )?.status(),
    ).toBe(200);
    await expect(junk.getByTestId("tour-found")).toHaveText(
      "24 unidades encontradas",
    );
    await junk.close();

    // Limpar volta ao começo e à URL sem filtros.
    await anon.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(found).toHaveText("24 unidades encontradas");
    await expect(anon.getByLabel("Preço até")).toHaveValue("");
    expect(new URL(anon.url()).search).toBe("");
    if (isMobile)
      await anon.getByRole("button", { name: /^Ver \d+ unidades/ }).click();

    // Corte por andar e ficha (#46). Link da 601: sob consulta, 3 quartos, 6º andar.
    const region = anon.getByTestId("tour-building-3d");
    const sheet = anon.getByTestId("tour-unit-sheet");
    await anon.goto(`/e/${slug}?unidade=601`);
    // The sheet is already in the HTML; wait for the page to be interactive.
    await expect(region.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await expect(sheet).toContainText("Unidade 601");
    await expect(sheet).toContainText("6º andar");
    await expect(sheet).toContainText("3 quartos");
    await expect(anon.getByTestId("tour-unit-price")).toHaveText(
      "Sob consulta",
    );
    await expect(
      sheet.getByRole("link", { name: "Ver por dentro" }),
    ).toHaveAttribute("href", `/e/${slug}/u/601`);
    // Escolher a unidade não corta o prédio (#110): só o filtro "Ver andar".
    await expect(region).toHaveAttribute("data-cut-floor", "");

    // Escolher o 2º andar e abrir a 202 pela lista: preço público e link com a unidade.
    await anon.getByLabel("Ver andar").selectOption("2");
    await expect(region).toHaveAttribute("data-cut-floor", "2");
    await anon
      .getByLabel("Escolher unidade", { exact: true })
      .selectOption("202");
    await expect(anon.getByTestId("tour-unit-price")).toHaveText(/200\.000,00/);
    await expect(sheet).toContainText("2 quartos");
    expect(new URL(anon.url()).searchParams.get("unidade")).toBe("202");

    // Fechar a ficha tira a unidade do link; voltar ao prédio inteiro.
    await sheet.getByRole("button", { name: "Fechar" }).click();
    await expect(sheet).toHaveCount(0);
    expect(new URL(anon.url()).searchParams.get("unidade")).toBeNull();
    await anon.getByRole("button", { name: "Ver o prédio inteiro" }).click();
    await expect(region).toHaveAttribute("data-cut-floor", "");
    await visitor.close();
  });
});
