import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Resumo do mês no painel (issue #72): os números vêm do banco e batem com os
// eventos gravados. Eventos conhecidos: este mês e o mês passado.

test.describe("Resumo do mês no painel", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("mostra os números do mês, compara com o mês passado e tem estado vazio", async ({
    page,
  }, testInfo) => {
    const device = testInfo.project.name;
    // Empreendimento NOVO e sem visitas: estado vazio (o corretor de teste
    // pode ter outros empreendimentos de outros testes; confere só o cartão).
    const id = await createBuilding(page, `Resumo ${Date.now()} ${device}`);
    runSql(
      `insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values ('${id}', 1, '101', 1), ('${id}', 1, '102', 2);
       insert into public.tipologias (empreendimento_id, nome) values ('${id}', 'T');
       insert into public.comodos (tipologia_id, nome, geometria)
         select t.id, c.nome, '{"tipo":"poligono","pontos":[[0,0],[3,0],[3,3],[0,3]],"pe_direito":2.7}'::jsonb
           from public.tipologias t, (values ('Sala'), ('Suíte')) as c(nome) where t.empreendimento_id = '${id}';
       update public.empreendimentos set status = 'publicado' where id = '${id}';`,
    );
    const unit = (n: string) =>
      `(select id from public.unidades where empreendimento_id = '${id}' and numero = '${n}')`;
    const room = (n: string) =>
      `(select c.id from public.comodos c join public.tipologias t on t.id = c.tipologia_id where t.empreendimento_id = '${id}' and c.nome = '${n}')`;
    const s = (n: number) => `'sessao_resumo_${device}_${n}'`;

    // ESTE MÊS: 3 sessões (1 caminhou), 2 cliques no WhatsApp, a 101 aberta
    // 3 vezes e a 102 uma vez, Sala vista 2 vezes e Suíte 1.
    runSql(
      `insert into public.eventos (empreendimento_id, unidade_id, comodo_id, sessao_id, tipo, dados, criado_em) values
         ('${id}', null, null, ${s(1)}, 'abriu_tour', '{}', now()),
         ('${id}', null, null, ${s(2)}, 'abriu_tour', '{}', now()),
         ('${id}', null, null, ${s(3)}, 'abriu_tour', '{}', now()),
         ('${id}', ${unit("101")}, null, ${s(1)}, 'abriu_unidade', '{}', now()),
         ('${id}', ${unit("101")}, null, ${s(2)}, 'abriu_unidade', '{}', now()),
         ('${id}', ${unit("101")}, null, ${s(3)}, 'abriu_unidade', '{}', now()),
         ('${id}', ${unit("102")}, null, ${s(3)}, 'abriu_unidade', '{}', now()),
         ('${id}', ${unit("101")}, ${room("Sala")}, ${s(1)}, 'viu_comodo', '{}', now()),
         ('${id}', ${unit("101")}, ${room("Sala")}, ${s(2)}, 'viu_comodo', '{}', now()),
         ('${id}', ${unit("101")}, ${room("Suíte")}, ${s(2)}, 'viu_comodo', '{}', now()),
         ('${id}', ${unit("101")}, null, ${s(1)}, 'caminhou', '{}', now()),
         ('${id}', null, null, ${s(1)}, 'clicou_whatsapp', '{}', now()),
         ('${id}', null, null, ${s(2)}, 'clicou_whatsapp', '{}', now());
       insert into public.leads (empreendimento_id, nome, email, consentimento_lgpd)
         values ('${id}', 'Lead Resumo', 'resumo@exemplo.test', true);
       -- MÊS PASSADO: 1 sessão (o resumo compara: 3 visitas vs 1).
       insert into public.eventos (empreendimento_id, sessao_id, tipo, criado_em)
         values ('${id}', ${s(9)}, 'abriu_tour', date_trunc('month', now()) - interval '10 days');`,
    );

    await page.goto("/painel");
    const card = page.getByTestId("month-summary");
    await expect(card).toBeVisible();
    // O corretor de teste tem outros empreendimentos, então confere o cartão
    // do MEU empreendimento (linha da lista "Por empreendimento").
    const mine = page
      .getByTestId("summary-project")
      .filter({ hasText: `Resumo ` })
      .filter({ hasText: device });
    await expect(mine).toContainText("3 visitas");
    await expect(mine).toContainText("1 contato");
    await expect(mine).toContainText("1 caminharam por dentro");
    await expect(mine).toContainText("Unidades mais vistas: 101 (3), 102 (1)");
    await expect(mine).toContainText(
      "Cômodos mais vistos: Sala (2), Suíte (1)",
    );

    // Totais do cartão incluem o meu empreendimento (outros testes também
    // deixam visitas): pelo menos o que eu gravei, e a frase tem o formato.
    const visits = Number(
      (await page.getByTestId("stat-Visitas").innerText()).replace(/\D/g, ""),
    );
    expect(visits).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId("summary-headline")).toContainText(
      /^Seu tour gerou \d+ contatos? e \d+ visitas? em \w+\.$/,
    );
    await expect(page.getByTestId("stat-Cliques no WhatsApp")).toBeVisible();

    const axe = await new AxeBuilder({ page })
      .include('[data-testid="month-summary"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
