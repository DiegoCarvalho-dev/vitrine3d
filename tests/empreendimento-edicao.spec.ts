import { expect } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  runSql,
} from "./fixtures";

// Edição, publicação e exclusão de empreendimento (issue #29). Usa o corretor
// já logado do tests/global-setup.ts; tudo some no global-teardown (cascata).

test.describe("Editar, publicar e excluir empreendimento", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  // Muitos passos (criar, salvar, recarregar) e o servidor de dev fica lento
  // com a suíte inteira rodando em paralelo.
  test.setTimeout(90_000);

  test("edita dados e segurança da compra; continuam depois de recarregar", async ({
    page,
  }, testInfo) => {
    await createBuilding(page, `Edição ${Date.now()} ${testInfo.project.name}`);

    await page
      .getByLabel("Descrição")
      .fill("Lazer completo e vista para o parque.");
    await page.getByLabel("Endereço").fill("Rua das Flores, 100");
    await page.getByLabel("Andares", { exact: true }).fill("9");
    await page.getByLabel("Construtora").fill("Construtora Exemplo");
    await page.getByLabel("Registro de incorporação").fill("R.5/123.456");
    await page.getByLabel("Previsão de entrega").fill("2028-06-30");
    await page.getByLabel("Informações conferidas em").fill("2026-11-10");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Alterações salvas.")).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await expect(page.getByLabel("Descrição")).toHaveValue(
      "Lazer completo e vista para o parque.",
    );
    await expect(page.getByLabel("Endereço")).toHaveValue(
      "Rua das Flores, 100",
    );
    await expect(page.getByLabel("Andares", { exact: true })).toHaveValue("9");
    await expect(page.getByLabel("Construtora")).toHaveValue(
      "Construtora Exemplo",
    );
    await expect(page.getByLabel("Registro de incorporação")).toHaveValue(
      "R.5/123.456",
    );
    await expect(page.getByLabel("Previsão de entrega")).toHaveValue(
      "2028-06-30",
    );
    await expect(page.getByLabel("Informações conferidas em")).toHaveValue(
      "2026-11-10",
    );
  });

  test("não publica sem os requisitos e diz o que falta; arquiva e desarquiva", async ({
    page,
  }, testInfo) => {
    await createBuilding(
      page,
      `Publicar ${Date.now()} ${testInfo.project.name}`,
    );

    const panel = page.getByTestId("publish-panel");
    await expect(
      panel.getByRole("button", { name: "Publicar" }),
    ).toBeDisabled();
    const checklist = page.getByTestId("publish-checklist");
    await expect(checklist).toContainText("Foto de capa");
    await expect(checklist).toContainText("Pelo menos 1 tipologia com cômodos");
    await expect(checklist).toContainText("Unidades geradas");

    // Texto ainda não salvo não pode sumir ao mudar o status.
    await page.getByLabel("Descrição").fill("Rascunho não salvo");
    await panel.getByRole("button", { name: "Arquivar" }).click();
    await expect(panel.getByText("Arquivado", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel("Descrição")).toHaveValue(
      "Rascunho não salvo",
    );
    await panel.getByRole("button", { name: "Desarquivar" }).click();
    await expect(panel.getByText("Rascunho", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("exclui pedindo o nome e some da lista", async ({ page }, testInfo) => {
    const name = `Excluir ${Date.now()} ${testInfo.project.name}`;
    await createBuilding(page, name);

    await page.getByRole("button", { name: "Excluir empreendimento" }).click();
    const confirm = page.getByRole("button", { name: "Excluir de vez" });
    await expect(confirm).toBeDisabled();
    await page
      .getByLabel("Digite o nome do empreendimento")
      .fill("nome errado");
    await expect(confirm).toBeDisabled();
    await page.getByLabel("Digite o nome do empreendimento").fill(name);
    await confirm.click();

    await expect(page).toHaveURL(/\/painel\?excluido=1$/, { timeout: 20_000 });
    await expect(page.getByText("Empreendimento excluído.")).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
  });

  test("com leads não exclui: só arquiva", async ({ page }, testInfo) => {
    const id = await createBuilding(
      page,
      `Com leads ${Date.now()} ${testInfo.project.name}`,
    );
    // Lead direto no banco. O banco só aceita lead em empreendimento
    // publicado (#84), então publica, recebe o lead e volta ao rascunho.
    runSql(
      `update public.empreendimentos set status = 'publicado' where id = '${id}';
       insert into public.leads (empreendimento_id, nome, telefone, consentimento_lgpd) values ('${id}', 'Cliente Teste', '11999990000', true);
       update public.empreendimentos set status = 'rascunho' where id = '${id}'`,
    );

    await page.reload();
    await expect(page.getByTestId("delete-blocked")).toContainText("1 contato");
    await expect(
      page.getByRole("button", { name: "Excluir empreendimento" }),
    ).toHaveCount(0);
    await expect(
      page
        .getByTestId("publish-panel")
        .getByRole("button", { name: "Arquivar" }),
    ).toBeVisible();
  });
});
