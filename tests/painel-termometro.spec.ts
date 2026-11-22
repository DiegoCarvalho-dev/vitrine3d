import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  runSql,
} from "./fixtures";

// Termômetro de interesse (issue #73): quente, morno e frio, sempre com o
// motivo, no painel de leads (selo e ordenação).

test.describe("Termômetro de interesse", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("selo com motivo, 'mais interessados' primeiro e lead sem visita é frio", async ({
    page,
  }, testInfo) => {
    const device = testInfo.project.name;
    const id = await createBuilding(page, `Termômetro ${Date.now()} ${device}`);
    const quente = `sessao_quente_${device}_73`;
    const morno = `sessao_morno_${device}_73`;
    runSql(
      `insert into public.unidades (empreendimento_id, andar, numero, posicao_no_andar) values ('${id}', 1, '902', 1);
       update public.empreendimentos set status = 'publicado' where id = '${id}';
       -- Do mais antigo para o mais novo: Ana (quente), Bia (morna), Caio (frio, sem visita).
       insert into public.leads (empreendimento_id, nome, email, consentimento_lgpd, sessao_id, criado_em) values
         ('${id}', 'Ana', 'ana@exemplo.test', true, '${quente}', now() - interval '3 minutes'),
         ('${id}', 'Bia', 'bia@exemplo.test', true, '${morno}', now() - interval '2 minutes'),
         ('${id}', 'Caio', 'caio@exemplo.test', true, null, now() - interval '1 minute');
       -- Ana: voltou em outro dia (2), caminhou na 902 (2) e ficou 12 min (3) = 7: quente.
       insert into public.eventos (empreendimento_id, unidade_id, sessao_id, tipo, dados, criado_em)
         select '${id}', u.id, '${quente}', t.tipo::public.tipo_evento, t.dados::jsonb, now() - t.antes::interval
           from public.unidades u, (values
             ('abriu_unidade', '{"via":"pagina"}', '1 day'),
             ('caminhou', '{}', '1 day'),
             ('saiu', '{"segundos":720}', '1 day'),
             ('abriu_unidade', '{"via":"ficha"}', '5 minutes')
           ) as t(tipo, dados, antes) where u.empreendimento_id = '${id}';
       -- Bia: só ficou 5 min = 2 pontos... + caminhou (2) = 4: morna.
       insert into public.eventos (empreendimento_id, unidade_id, sessao_id, tipo, dados)
         select '${id}', u.id, '${morno}', t.tipo::public.tipo_evento, t.dados::jsonb
           from public.unidades u, (values ('caminhou', '{}'), ('saiu', '{"segundos":300}')) as t(tipo, dados)
          where u.empreendimento_id = '${id}';`,
    );
    const mine = `/painel/leads?empreendimento=${id}`;
    const item = (name: string) =>
      page.getByTestId("lead-item").filter({ hasText: name });

    // Mais recentes primeiro (padrão): Caio, Bia, Ana.
    await page.goto(mine);
    await expect(page.getByTestId("lead-item")).toHaveText([
      /Caio/,
      /Bia/,
      /Ana/,
    ]);
    // Selo e motivo de cada um, em linguagem simples.
    await expect(item("Ana").getByTestId("interest-badge")).toHaveText(
      "Quente",
    );
    await expect(item("Ana").getByTestId("interest-reasons")).toContainText(
      "ficou 12 min no tour, voltou em outro dia, caminhou por dentro da unidade 902",
    );
    await expect(item("Bia").getByTestId("interest-badge")).toHaveText("Morno");
    await expect(item("Bia").getByTestId("interest-reasons")).toContainText(
      "caminhou por dentro da unidade 902",
    );
    await expect(item("Caio").getByTestId("interest-badge")).toHaveText("Frio");
    await expect(item("Caio").getByTestId("interest-reasons")).toContainText(
      "sem registro da visita no tour",
    );

    // Mais interessados primeiro: Ana, Bia, Caio.
    await page.goto(`${mine}&ordem=interesse`);
    await expect(page.getByTestId("lead-item")).toHaveText([
      /Ana/,
      /Bia/,
      /Caio/,
    ]);

    // O detalhe mostra o mesmo selo, com o motivo.
    await item("Ana").click();
    await expect(page).toHaveURL(/\/painel\/leads\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("interest-badge")).toHaveText("Quente");
    await expect(page.getByTestId("interest-reasons")).toContainText(
      "caminhou por dentro da unidade 902",
    );
  });
});
