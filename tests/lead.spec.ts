import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Formulário de interesse (issue #69): o visitante deixa nome e contato com
// consentimento LGPD; o lead chega no banco ligado à unidade, à origem do
// link e à sessão da visita.

test.describe("Formulário de interesse", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("envia com consentimento, recusa sem e descarta robô", async ({
    page,
    browser,
  }, testInfo) => {
    const id = await createBuilding(
      page,
      `Lead ${Date.now()} ${testInfo.project.name}`,
    );
    runSql(
      `insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values ('${id}', 1, '101', 1);
       update public.empreendimentos set status = 'publicado', numero_andares = 1, unidades_por_andar = 1 where id = '${id}'`,
    );
    const [{ slug }] = querySql<{ slug: string }>(
      `select slug from public.empreendimentos where id = '${id}'`,
    );
    const leads = () =>
      querySql<{
        nome: string;
        telefone: string | null;
        email: string | null;
        origem: string | null;
        unidade: string | null;
        sessao_id: string | null;
        consentimento_em: string | null;
      }>(
        `select l.nome, l.telefone, l.email, l.origem, u.numero as unidade, l.sessao_id, l.consentimento_em::text
           from public.leads l left join public.unidades u on u.id = l.unidade_id
          where l.empreendimento_id = '${id}' order by l.criado_em`,
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

    // Página da unidade, vinda de um link do Instagram.
    await anon.goto(`/e/${slug}/u/101?utm_source=instagram`);
    const form = anon.getByTestId("lead-form");
    await expect(form).toContainText("unidade 101");

    // Acessibilidade do formulário (WCAG 2 A/AA).
    const axe = await new AxeBuilder({ page: anon })
      .include('[data-testid="lead-form"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    // Sem contato e sem consentimento: avisa e não envia.
    await form.getByLabel("Nome").fill("Maria Souza");
    await form.getByRole("button", { name: "Enviar" }).click();
    await expect(anon.getByTestId("lead-phone-error")).toContainText(
      "telefone ou um e-mail",
    );
    await expect(anon.getByTestId("lead-consent-error")).toContainText(
      "concorda",
    );

    // Com telefone e consentimento: enviado.
    await form.getByLabel("Telefone / WhatsApp").fill("(11) 98888-7777");
    await form
      .getByRole("checkbox", { name: /Concordo em enviar meus dados/ })
      .click();
    // A pessoa leva alguns segundos (o envio instantâneo é tratado como robô).
    await anon.waitForTimeout(3_200);
    await form.getByRole("button", { name: "Enviar" }).click();
    await expect(anon.getByTestId("lead-sent")).toContainText(
      "Recebemos seu interesse",
    );
    const [lead] = leads();
    expect(lead).toMatchObject({
      nome: "Maria Souza",
      telefone: "+5511988887777",
      email: null,
      origem: "instagram",
      unidade: "101",
    });
    expect(lead.sessao_id).toMatch(/^[a-f0-9]{32}$/);
    expect(lead.consentimento_em).toBeTruthy();
    expect(
      querySql<{ n: number }>(
        `select count(*)::int as n from public.eventos where empreendimento_id = '${id}' and tipo = 'enviou_lead'`,
      )[0].n,
    ).toBe(1);

    // Robô: preenche o campo escondido. Parece que foi, mas nada é salvo.
    const bot = await visitor.newPage();
    await bot.goto(`/e/${slug}`);
    const botForm = bot.getByTestId("lead-form");
    await botForm.getByLabel("Nome").fill("Robô");
    await botForm.getByLabel("E-mail").fill("robo@exemplo.test");
    await botForm
      .getByRole("checkbox", { name: /Concordo em enviar meus dados/ })
      .click();
    // Robôs preenchem tudo o que acham no HTML, inclusive o campo escondido.
    await bot
      .locator("#lead-website")
      .fill("http://spam.example", { force: true });
    await bot.waitForTimeout(3_200);
    await botForm.getByRole("button", { name: "Enviar" }).click();
    await expect(bot.getByTestId("lead-sent")).toBeVisible();
    expect(leads()).toHaveLength(1);

    // Política de privacidade no ar.
    expect((await anon.goto("/privacidade"))?.status()).toBe(200);
    await expect(
      anon.getByRole("heading", { level: 1, name: "Política de privacidade" }),
    ).toBeVisible();
    await visitor.close();
  });
});
