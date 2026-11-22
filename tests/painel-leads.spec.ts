import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Painel de leads (issue #71): o corretor vê, filtra, atende e apaga os
// contatos dos SEUS empreendimentos, e nunca vê os de outro corretor.

test.describe("Painel de leads", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("lista, filtra, muda a situação, abre o WhatsApp, apaga e isola corretores", async ({
    page,
  }, testInfo) => {
    const tag = `${Date.now()}-${testInfo.project.name}`;
    const id = await createBuilding(page, `Leads ${tag}`);
    runSql(
      `insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values ('${id}', 1, '101', 1);
       update public.empreendimentos set status = 'publicado' where id = '${id}';
       insert into public.leads (empreendimento_id, unidade_id, nome, telefone, email, mensagem, origem, consentimento_lgpd, sessao_id)
         select '${id}', u.id, 'Maria ${tag}', '+5511988887777', 'maria@exemplo.test',
                '<b>Tem vaga?</b>', 'instagram', true, 'sessao_painel_${testInfo.project.name}_71'
           from public.unidades u where u.empreendimento_id = '${id}';
       insert into public.leads (empreendimento_id, nome, email, consentimento_lgpd)
         values ('${id}', 'João ${tag}', 'joao@exemplo.test', true);
       -- Visita da Maria: abriu a unidade, caminhou e ficou 5 minutos.
       insert into public.eventos (empreendimento_id, unidade_id, sessao_id, tipo, dados)
         select '${id}', u.id, 'sessao_painel_${testInfo.project.name}_71', t.tipo::public.tipo_evento, t.dados::jsonb
           from public.unidades u, (values ('abriu_unidade', '{"via":"pagina"}'), ('caminhou', '{}'), ('saiu', '{"segundos":300}')) as t(tipo, dados)
          where u.empreendimento_id = '${id}';
       -- Outro corretor, com um lead que o da sessão NUNCA pode ver.
       do $$
       declare outro uuid := gen_random_uuid(); emp uuid;
       begin
         insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
         values ('00000000-0000-0000-0000-000000000000', outro, 'authenticated', 'authenticated', 'e2e-outro-${tag}@exemplo.test', '', now(), '{}', '{"nome":"Outro Corretor"}', now(), now(), '', '', '', '');
         insert into public.empreendimentos (dono_id, nome, slug, numero_andares, unidades_por_andar, status)
         values (outro, 'Alheio ${tag}', 'alheio-${tag.toLowerCase()}', 2, 2, 'publicado') returning id into emp;
         insert into public.leads (empreendimento_id, nome, email, consentimento_lgpd)
         values (emp, 'Segredo ${tag}', 'segredo@exemplo.test', true);
       end $$;`,
    );
    const leadId = (name: string) =>
      querySql<{ id: string }>(
        `select id from public.leads where nome = '${name} ${tag}'`,
      )[0].id;
    const foreignLead = leadId("Segredo");

    // Lista: só os meus (2), mais novos primeiro; contador no menu.
    await page.goto("/painel/leads");
    await expect(page.getByTestId("lead-item")).toHaveCount(2);
    await expect(page.getByText(`Segredo ${tag}`)).toHaveCount(0);
    await expect(page.getByTestId("menu-leads-count")).toBeVisible();

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude("[data-sonner-toaster]")
      .analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    // Filtros pelo link: situação e empreendimento.
    await page.goto(`/painel/leads?status=em_contato`);
    await expect(page.getByTestId("leads-empty")).toBeVisible();
    await page.goto(`/painel/leads?empreendimento=${id}&status=novo`);
    await expect(page.getByTestId("lead-item")).toHaveCount(2);
    // Filtro com o id de outro corretor não mostra nada dele.
    await page.goto(
      `/painel/leads?status=novo&empreendimento=${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}`,
    );
    await expect(page.getByTestId("leads-empty")).toBeVisible();

    // Detalhe da Maria: contato, mensagem como TEXTO, resumo da visita.
    await page.goto("/painel/leads");
    await page.getByTestId("lead-item").filter({ hasText: "Maria" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Maria",
    );
    await expect(page.getByText("<b>Tem vaga?</b>")).toBeVisible();
    await expect(page.locator("main b")).toHaveCount(0);
    await expect(page.getByTestId("lead-visit")).toContainText(
      "Unidades abertas: 101",
    );
    await expect(page.getByTestId("lead-visit")).toContainText(
      "Tempo no tour: 5 min",
    );
    await expect(page.getByTestId("lead-visit")).toContainText(
      "Caminhou por dentro",
    );
    await expect(page.getByTestId("lead-whatsapp")).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/5511988887777\?text=/,
    );

    // Situação: muda e fica salva.
    await page.getByRole("button", { name: "Em contato" }).click();
    await expect(page.getByText("Situação: Em contato.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      querySql<{ status: string }>(
        `select status::text from public.leads where id = '${leadId("Maria")}'`,
      )[0].status,
    ).toBe("em_contato");
    await page.goto("/painel/leads?status=em_contato");
    await expect(page.getByTestId("lead-item")).toHaveCount(1);

    // Lead de outro corretor: 404 (nunca "proibido").
    expect((await page.goto(`/painel/leads/${foreignLead}`))?.status()).toBe(
      404,
    );
    expect((await page.goto("/painel/leads/nao-e-um-id"))?.status()).toBe(404);

    // Apagar a pedido do cliente (LGPD), com confirmação.
    await page.goto("/painel/leads");
    await page.getByTestId("lead-item").filter({ hasText: "João" }).click();
    await page.getByRole("button", { name: "Apagar contato" }).click();
    await page.getByRole("button", { name: "Apagar de vez" }).click();
    await expect(page).toHaveURL(/\/painel\/leads$/, { timeout: 15_000 });
    await expect(page.getByTestId("lead-item")).toHaveCount(1);
    expect(
      querySql<{ n: number }>(
        `select count(*)::int as n from public.leads where nome = 'João ${tag}'`,
      )[0].n,
    ).toBe(0);
    // O lead do outro corretor continua lá, intacto.
    expect(
      querySql<{ n: number }>(
        `select count(*)::int as n from public.leads where id = '${foreignLead}'`,
      )[0].n,
    ).toBe(1);
  });
});
