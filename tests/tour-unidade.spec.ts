import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Inside the unit (issues #52 and #50). Prédio 2 × 2 montado no banco:
// a 101 tem planta (sala + quarto) e preço público; a 102 não tem tipologia;
// a 201 tem planta e é "sob consulta".

test.describe("Tour da unidade /e/[slug]/u/[numero]", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  // If an assertion fails while the fake WhatsApp is set, it still goes away.
  let cleanupSql = "";
  test.afterEach(() => {
    if (cleanupSql) runSql(cleanupSql);
    cleanupSql = "";
  });

  test("vai do prédio à unidade e volta, com a planta em 3D e 404", async ({
    page,
    browser,
  }, testInfo) => {
    const id = await createBuilding(
      page,
      `Unidade ${Date.now()} ${testInfo.project.name}`,
    );
    runSql(
      `insert into public.tipologias (empreendimento_id, nome, quartos, area_privativa_m2) values ('${id}', 'Tipo A', 2, 32)`,
    );
    const [{ id: typeA }] = querySql<{ id: string }>(
      `select id from public.tipologias where empreendimento_id = '${id}'`,
    );
    runSql(
      `insert into public.comodos (tipologia_id, nome, tipo, descricao, area_m2, geometria, ordem) values
         ('${typeA}', 'Sala', 'sala', 'Sala ampla com luz da manhã.', 20, '{"tipo":"poligono","pontos":[[0,0],[5,0],[5,4],[0,4]],"pe_direito":2.7}', 1),
         ('${typeA}', 'Quarto', 'quarto', null, 12, '{"tipo":"poligono","pontos":[[5,0],[8,0],[8,4],[5,4]],"pe_direito":2.7}', 2);
       insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar, tipologia_id, preco, exibir_preco) values
         ('${id}', 1, '101', 1, '${typeA}', 300000, true),
         ('${id}', 1, '102', 2, null, null, false),
         ('${id}', 2, '201', 1, '${typeA}', 876543, false),
         ('${id}', 2, '202', 2, null, null, false);
       update public.empreendimentos set status = 'publicado', numero_andares = 2, unidades_por_andar = 2 where id = '${id}'`,
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

    // Da ficha (com filtro de 2 quartos) para dentro da 101.
    await anon.goto(`/e/${slug}?quartos=2&unidade=101`);
    await expect(
      anon.getByTestId("tour-building-3d").locator("canvas"),
    ).toBeVisible({ timeout: 30_000 });
    await anon
      .getByTestId("tour-unit-sheet")
      .getByRole("link", { name: "Ver por dentro" })
      .click();
    await expect(anon).toHaveURL(new RegExp(`/e/${slug}/u/101\\?quartos=2$`));
    await expect(
      anon.getByRole("heading", { level: 1, name: "Unidade 101" }),
    ).toBeVisible();
    await expect(anon.getByTestId("unit-price")).toHaveText(/300\.000,00/);
    await expect(anon.getByTestId("unit-3d").locator("canvas")).toBeVisible({
      timeout: 30_000,
    });
    // A unidade abre por dentro (#110); a vista de cima fica a um toque.
    await expect(anon.locator('[data-mode="walk"]')).toBeVisible();
    await anon.getByRole("button", { name: "Voltar à vista de cima" }).click();

    // Vista de cima (#50): etiqueta por cômodo; tocar mostra a descrição.
    const labels = anon.getByTestId("room-label");
    await expect(labels).toHaveCount(2);
    await expect(anon.getByText("Imagem ilustrativa")).toBeVisible();
    await expect(anon.getByText("Área privativa:")).toContainText("32 m²");
    // Etiqueta no 3D (toque); visível porque os dois cômodos têm espaço.
    const salaLabel = labels.filter({ hasText: "Sala" });
    await expect(salaLabel).toBeVisible();
    await salaLabel.click();
    await expect(anon.getByTestId("room-details")).toContainText(
      "Sala ampla com luz da manhã.",
    );
    // A lista de cômodos (teclado e leitor de tela) faz o mesmo.
    await anon
      .getByRole("list", { name: "Cômodos" })
      .getByRole("button", { name: "Quarto" })
      .click();
    await expect(anon.getByTestId("room-details")).toContainText(
      "Sem descrição para este cômodo.",
    );
    await anon.screenshot({
      path: testInfo.outputPath("vista-de-cima.png"),
      fullPage: true,
    });

    // Modo caminhar (#51): entra, anda um pouco e volta à vista de cima.
    const pageErrors: string[] = [];
    anon.on("pageerror", (error) => pageErrors.push(error.message));
    await anon.getByRole("button", { name: "Caminhar por dentro" }).click();
    const viewer = anon.locator('[data-mode="walk"]');
    await expect(viewer.locator("canvas")).toBeVisible({ timeout: 30_000 });
    await expect(labels).toHaveCount(0);
    if (isMobile) {
      // Tocar no chão (#108): toque embaixo, no meio da imagem, anda até lá.
      const joystick = anon.getByTestId("walk-joystick");
      await expect(joystick).toHaveCount(0); // o controle agora é opcional
      await expect(viewer).toContainText("Toque no chão");
      await viewer.scrollIntoViewIfNeeded(); // tocar dentro da tela
      const area = (await viewer.boundingBox())!;
      await anon.touchscreen.tap(
        area.x + area.width / 2,
        area.y + area.height * 0.8,
      );
      await expect(viewer).toHaveAttribute("data-walk-at", /^-?\d/, {
        timeout: 10_000,
      });
      // O controle continua disponível, atrás de um botão.
      await viewer.getByRole("button", { name: "Controle" }).click();
      await expect(joystick).toBeVisible();
      const box = (await joystick.boundingBox())!;
      await anon.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await anon.mouse.down();
      await anon.mouse.move(box.x + box.width / 2, box.y);
      await anon.waitForTimeout(500);
      await anon.mouse.up();
    } else {
      await expect(viewer).toContainText("W A S D");
      // The canvas appears before the walk listens to the keys.
      await expect(viewer).toHaveAttribute("data-walk-ready", "true");
      // Long enough for a few frames even with software 3D (CI): a real
      // step is what counts as "caminhou" (#110).
      const walkedEvent = anon.waitForRequest(
        (r) =>
          r.url().includes("/api/eventos") &&
          (r.postData() ?? "").includes('"caminhou"'),
        { timeout: 10_000 },
      );
      await anon.keyboard.down("KeyW");
      await anon.waitForTimeout(1_500);
      await anon.keyboard.up("KeyW");
      await walkedEvent; // the step was sent as "caminhou"
    }
    await anon.getByRole("button", { name: "Voltar à vista de cima" }).click();
    await expect(anon.locator('[data-mode="top"]')).toBeVisible();
    await expect(labels).toHaveCount(2);
    expect(pageErrors).toEqual([]);

    // Tela cheia (#109): opção só para telas de toque (o 3D é pequeno nelas).
    const fullscreenButton = anon.getByRole("button", { name: "Tela cheia" });
    if (!isMobile) {
      await expect(fullscreenButton).toHaveCount(0);
    } else {
      const frame = anon.getByTestId("unit-3d");
      const unitUrl = anon.url();
      await fullscreenButton.click();
      await expect(frame).not.toHaveAttribute("data-fullscreen", "no");
      // Só o essencial: sair e alternar entre vista de cima e caminhar.
      const exit = frame.getByRole("button", { name: "Sair da tela cheia" });
      await expect(exit).toBeVisible();
      await expect(frame).toContainText("Imagem ilustrativa");
      // Em pé (retrato), a dica pede para virar o celular.
      await expect(frame.getByTestId("rotate-hint")).toContainText(
        "Vire o celular",
      );
      await frame.getByRole("button", { name: "Caminhar" }).click();
      await expect(frame.locator('[data-mode="walk"]')).toBeVisible();
      await frame.getByRole("button", { name: "Vista de cima" }).click();
      await expect(frame.locator('[data-mode="top"]')).toBeVisible();
      await exit.click();
      await expect(frame).toHaveAttribute("data-fullscreen", "no");
      await expect(fullscreenButton).toBeVisible();
      expect(anon.url()).toBe(unitUrl); // a página ficou como estava

      // Gesto de voltar (tela cheia por cima da página, como no iPhone):
      // fecha a tela cheia e continua na unidade.
      await fullscreenButton.click();
      await expect(frame).not.toHaveAttribute("data-fullscreen", "no");
      if ((await frame.getAttribute("data-fullscreen")) === "pseudo") {
        await anon.goBack();
        await expect(frame).toHaveAttribute("data-fullscreen", "no");
        expect(anon.url()).toBe(unitUrl);
      } else {
        await frame.getByRole("button", { name: "Sair da tela cheia" }).click();
      }
      await expect(frame).toHaveAttribute("data-fullscreen", "no");
    }

    // Voltar ao prédio: mesmos filtros e a ficha da 101 aberta.
    await anon.getByRole("link", { name: "← Voltar ao prédio" }).click();
    await expect(anon.getByTestId("tour-unit-sheet")).toContainText(
      "Unidade 101",
    );
    const back = new URL(anon.url());
    expect(back.searchParams.get("quartos")).toBe("2");
    expect(back.searchParams.get("unidade")).toBe("101");

    // Aparelho sem WebGL (#53): mensagem amigável e a planta em 2D.
    const noWebgl = await visitor.newPage();
    await noWebgl.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      // @ts-expect-error -- test double: no WebGL in this "phone"
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (String(type).startsWith("webgl")) return null;
        return original.call(this, type, ...rest);
      };
    });
    await noWebgl.goto(`/e/${slug}/u/101`);
    await expect(noWebgl.getByTestId("unit-no-webgl")).toContainText(
      "não conseguiu abrir o 3D",
    );
    await expect(noWebgl.getByTestId("floor-plan-room")).toHaveCount(2);
    await noWebgl.close();

    // Botão WhatsApp (#68): link com a mensagem da unidade, evento ao tocar,
    // escondido no modo caminhar e ausente quando o perfil não tem WhatsApp.
    const ownerSql = `(select dono_id from public.empreendimentos where id = '${id}')`;
    cleanupSql = `update public.perfis set whatsapp = null where id = ${ownerSql}`;
    runSql(
      `update public.perfis set whatsapp = '+5511999990000' where id = ${ownerSql}`,
    );
    await anon.context().route("https://wa.me/**", (route) => route.abort());
    await anon.goto(`/e/${slug}`);
    const whats = anon.getByTestId("whatsapp-button");
    if (isMobile) {
      // O botão fica ABAIXO da gaveta de filtros: os botões dela continuam
      // tocáveis (o clique de teste falha se algo estiver por cima).
      await expect(
        anon.getByTestId("tour-building-3d").locator("canvas"),
      ).toBeVisible({ timeout: 30_000 });
      await anon.getByRole("button", { name: /^Filtros/ }).click();
      const seeUnits = anon.getByRole("button", { name: /^Ver \d+ unidades?/ });
      await seeUnits.click({ trial: true, timeout: 5_000 });
      await seeUnits.click();
    }
    await expect(whats).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/5511999990000\?text=Ol%C3%A1!%20Vi%20o%20Unidade.*no%20tour%203D\.%20Pode/,
    );
    await anon.goto(`/e/${slug}/u/101`);
    await expect(whats).toHaveAttribute(
      "href",
      /me%20interessei%20pela%20unidade%20101\./,
    );
    await anon.mouse.move(0, 0);
    const popup = anon.waitForEvent("popup").catch(() => null);
    await whats.click();
    await popup;
    await expect
      .poll(
        () =>
          querySql<{ n: number }>(
            `select count(*)::int as n from public.eventos where empreendimento_id = '${id}' and tipo = 'clicou_whatsapp'`,
          )[0].n,
        { timeout: 20_000 },
      )
      .toBe(1);
    // Abre por dentro, com o WhatsApp à mão (#110); na vista de cima também.
    await expect(anon.locator('[data-mode="walk"]')).toBeVisible();
    await expect(whats).toBeVisible();
    await anon.getByRole("button", { name: "Voltar à vista de cima" }).click();
    await expect(whats).toBeVisible();
    runSql(`update public.perfis set whatsapp = null where id = ${ownerSql}`);
    await anon.goto(`/e/${slug}/u/101`);
    await expect(anon.getByTestId("unit-price")).toBeVisible();
    await expect(whats).toHaveCount(0);

    // Sem tipologia: mensagem clara no lugar do 3D.
    await anon.goto(`/e/${slug}/u/102`);
    await expect(anon.getByTestId("unit-no-plan")).toBeVisible();

    // Sob consulta: sem valor na página nem na prévia do WhatsApp.
    await anon.goto(`/e/${slug}/u/201`);
    await expect(anon.getByTestId("unit-price")).toHaveText("Sob consulta");
    const description = await anon
      .locator('meta[property="og:description"]')
      .getAttribute("content");
    expect(description).toContain("Tipo A");
    expect(description).not.toContain("R$");
    expect(await anon.content()).not.toMatch(/876[.,]?543/);

    // Visitas registradas (#67): prédio, ficha, página da unidade, cômodos
    // (etiqueta e lista), modo caminhar e o tempo ao sair de cada página.
    const counts = () =>
      Object.fromEntries(
        querySql<{ tipo: string; n: number }>(
          `select tipo::text, count(*)::int as n from public.eventos where empreendimento_id = '${id}' group by tipo`,
        ).map(({ tipo, n }) => [tipo, n]),
      );
    await expect.poll(counts, { timeout: 20_000 }).toMatchObject({
      abriu_tour: expect.any(Number),
      abriu_unidade: expect.any(Number),
      viu_comodo: 2,
      caminhou: expect.any(Number),
      saiu: expect.any(Number),
    });
    const [{ vias }] = querySql<{ vias: string }>(
      `select string_agg(distinct dados->>'via', ',' order by dados->>'via') as vias from public.eventos where empreendimento_id = '${id}' and tipo in ('abriu_unidade', 'viu_comodo')`,
    );
    expect(vias).toBe("etiqueta,ficha,lista,pagina");

    // A rota recusa lixo, outro site e empreendimento em rascunho.
    const api = anon.request;
    const event = {
      empreendimentoId: id,
      sessaoId: "teste_e2e_sessao",
      tipo: "abriu_tour",
    };
    expect(
      (
        await api.post("/api/eventos", { data: { ...event, tipo: "x" } })
      ).status(),
    ).toBe(400);
    expect(
      (
        await api.post("/api/eventos", {
          data: event,
          headers: { origin: "https://outro-site.example" },
        })
      ).status(),
    ).toBe(403);

    // Unidade inexistente, número inválido e empreendimento em rascunho: 404.
    expect((await anon.goto(`/e/${slug}/u/999`))?.status()).toBe(404);
    expect((await anon.goto(`/e/${slug}/u/12345678901`))?.status()).toBe(404);
    // Espaço em volta e minúsculas ainda acham a unidade.
    expect((await anon.goto(`/e/${slug}/u/%20101%20`))?.status()).toBe(200);
    runSql(
      `update public.empreendimentos set status = 'rascunho' where id = '${id}'`,
    );
    expect((await anon.goto(`/e/${slug}/u/101`))?.status()).toBe(404);
    expect((await api.post("/api/eventos", { data: event })).status()).toBe(
      400,
    );
    await visitor.close();
  });
});
