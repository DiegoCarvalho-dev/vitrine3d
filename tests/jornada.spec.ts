import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Jornada completa (issue #85), do jeito que acontece de verdade:
// o VISITANTE abre o prédio, entra na unidade, caminha por dentro e deixa o
// contato; o CORRETOR vê o lead no painel (com a visita registrada pelo
// servidor), muda a situação e apaga a pedido do cliente.

test.describe("Jornada completa", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(180_000);

  test("prédio → unidade → caminhar → formulário → painel → situação → apagar", async ({
    page,
    browser,
  }, testInfo) => {
    const tag = `${Date.now()}-${testInfo.project.name}`;
    const id = await createBuilding(page, `Jornada ${tag}`);
    runSql(
      `insert into public.tipologias (empreendimento_id, nome, quartos, area_privativa_m2) values ('${id}', 'Tipo A', 1, 32)`,
    );
    const [{ id: typeA }] = querySql<{ id: string }>(
      `select id from public.tipologias where empreendimento_id = '${id}'`,
    );
    runSql(
      `insert into public.comodos (tipologia_id, nome, tipo, area_m2, geometria, ordem) values
         ('${typeA}', 'Sala', 'sala', 20, '{"tipo":"poligono","pontos":[[0,0],[5,0],[5,4],[0,4]],"pe_direito":2.7}', 1),
         ('${typeA}', 'Quarto', 'quarto', 12, '{"tipo":"poligono","pontos":[[5,0],[8,0],[8,4],[5,4]],"pe_direito":2.7}', 2);
       insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar, tipologia_id, preco, exibir_preco) values
         ('${id}', 1, '101', 1, '${typeA}', 300000, true);
       update public.empreendimentos set status = 'publicado', numero_andares = 1, unidades_por_andar = 1 where id = '${id}'`,
    );
    const [{ slug }] = querySql<{ slug: string }>(
      `select slug from public.empreendimentos where id = '${id}'`,
    );

    // ===== Visitante (sem login), no mesmo aparelho do projeto =====
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
    const pageErrors: string[] = [];
    anon.on("pageerror", (error) => pageErrors.push(error.message));

    // Prédio, com a 101 escolhida (como um toque nela), e para dentro.
    await anon.goto(`/e/${slug}?unidade=101&utm_source=whatsapp`);
    await anon
      .getByTestId("tour-unit-sheet")
      .getByRole("link", { name: "Ver por dentro" })
      .click();
    await expect(
      anon.getByRole("heading", { level: 1, name: "Unidade 101" }),
    ).toBeVisible({ timeout: 30_000 });

    // A unidade abre por dentro (#110); sem WebGL no navegador, planta 2D.
    const inside = anon.locator('[data-mode="walk"]');
    const walked = await inside
      .locator("canvas")
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (walked) {
      // Dar uns passos ("caminhou" conta só quando a pessoa anda de verdade).
      await inside.scrollIntoViewIfNeeded();
      const area = (await inside.boundingBox())!;
      if (isMobile) {
        await anon.touchscreen.tap(
          area.x + area.width / 2,
          area.y + area.height * 0.8,
        );
        await expect(inside).toHaveAttribute("data-walk-at", /^-?\d/, {
          timeout: 10_000,
        });
      } else {
        await expect(inside).toHaveAttribute("data-walk-ready", "true");
        const walkedEvent = anon.waitForRequest(
          (r) =>
            r.url().includes("/api/eventos") &&
            (r.postData() ?? "").includes('"caminhou"'),
          { timeout: 10_000 },
        );
        await inside.focus();
        await anon.keyboard.down("KeyW");
        await anon.waitForTimeout(1_500);
        await anon.keyboard.up("KeyW");
        await walkedEvent; // a real step counts as "caminhou"
      }
      await anon
        .getByRole("button", { name: "Voltar à vista de cima" })
        .click();
    } else {
      await expect(anon.getByTestId("unit-no-webgl")).toBeVisible();
    }

    // Formulário de interesse, com consentimento.
    const form = anon.getByTestId("lead-form");
    await form.getByLabel("Nome").fill(`Cliente ${tag}`);
    await form.getByLabel("Telefone / WhatsApp").fill("(11) 97777-6666");
    await form
      .getByRole("checkbox", { name: /Concordo em enviar meus dados/ })
      .click();
    await anon.waitForTimeout(3_200); // gente leva alguns segundos
    await form.getByRole("button", { name: "Enviar" }).click();
    await expect(anon.getByTestId("lead-sent")).toContainText(
      "Recebemos seu interesse",
    );
    expect(pageErrors).toEqual([]);
    await visitor.close();

    // ===== Corretor, no painel =====
    const mine = `/painel/leads?empreendimento=${id}`;
    await page.goto(mine);
    const item = page
      .getByTestId("lead-item")
      .filter({ hasText: `Cliente ${tag}` });
    await expect(item).toHaveCount(1);
    await item.click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      `Cliente ${tag}`,
    );
    // A visita veio pelo servidor (/api/eventos), ligada ao lead pela sessão.
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId("lead-visit")).toContainText(
        "Unidades abertas: 101",
        { timeout: 2_000 },
      );
      if (walked)
        await expect(page.getByTestId("lead-visit")).toContainText(
          "Caminhou por dentro",
          { timeout: 2_000 },
        );
    }).toPass({ timeout: 20_000 });
    await expect(page.getByTestId("lead-whatsapp")).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/5511977776666\?text=/,
    );

    // Situação: em contato.
    await page.getByRole("button", { name: "Em contato" }).click();
    await expect(page.getByText("Situação: Em contato.")).toBeVisible({
      timeout: 15_000,
    });

    // Apagar a pedido do cliente (LGPD): some o lead e a visita.
    await page.getByRole("button", { name: "Apagar contato" }).click();
    await page.getByRole("button", { name: "Apagar de vez" }).click();
    await expect(page).toHaveURL(/\/painel\/leads$/, { timeout: 15_000 });
    await page.goto(mine);
    await expect(page.getByTestId("leads-empty")).toBeVisible();
    const countIn = (table: string) =>
      querySql<{ n: number }>(
        `select count(*)::int as n from public.${table} where empreendimento_id = '${id}'`,
      )[0].n;
    await expect.poll(() => countIn("leads"), { timeout: 15_000 }).toBe(0);
    // ... e o histórico da visita vai junto (LGPD), só com a chave do servidor.
    await expect.poll(() => countIn("eventos"), { timeout: 15_000 }).toBe(0);
  });
});
