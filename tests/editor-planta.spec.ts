import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
  runSql,
} from "./fixtures";

// Editor visual da planta (issue #105): desenhar, mover, redimensionar,
// desfazer, aviso de sobreposição e salvar a planta inteira de uma vez.

type Meters = [number, number];

/** Planta (metros, Y para cima) → posição na tela. */
async function screenOf(page: Page, [x, y]: Meters) {
  const canvas = page.getByTestId("plan-canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const [vbWidth, vbHeight] = ((await canvas.getAttribute("viewBox")) ?? "")
    .split(" ")
    .slice(2)
    .map(Number);
  const pad = Number(await canvas.getAttribute("data-pad"));
  const height = Number(await canvas.getAttribute("data-height"));
  return {
    x: box.x + ((x + pad) * box.width) / vbWidth,
    y: box.y + ((height - y + pad) * box.height) / vbHeight,
  };
}

async function drag(page: Page, from: Meters, to: Meters) {
  const a = await screenOf(page, from);
  const b = await screenOf(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
}

test.describe("Editor visual da planta", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(150_000);

  test("desenha, move, redimensiona, desfaz, avisa sobreposição e salva", async ({
    page,
  }, testInfo) => {
    const id = await createBuilding(
      page,
      `Editor ${Date.now()} ${testInfo.project.name}`,
    );
    runSql(
      `insert into public.tipologias (empreendimento_id, nome, quartos) values ('${id}', 'Tipo E', 1)`,
    );
    const [{ id: typologyId }] = querySql<{ id: string }>(
      `select id from public.tipologias where empreendimento_id = '${id}'`,
    );
    await page.goto(`/painel/empreendimentos/${id}/tipologias/${typologyId}`);
    const editor = page.getByTestId("plan-editor");
    await expect(editor).toBeVisible({ timeout: 30_000 });

    // 1) Sala: sem cômodos, o editor já começa desenhando. Arrastar 0,0 → 4,3.
    await drag(page, [0, 0], [4, 3]);
    const panel = page.getByTestId("plan-room-panel");
    await expect(panel).toContainText("4 × 3 m");
    await panel.getByLabel("Tipo").selectOption("sala");
    await expect(panel.getByLabel("Nome")).toHaveValue("Sala");

    // 2) Quarto ao lado. No celular: dois toques (um em cada canto).
    await page.getByRole("button", { name: "Desenhar cômodo" }).click();
    if (testInfo.project.use.hasTouch) {
      // Cada posição calculada na hora: o 1º toque dá foco à grade e a
      // página pode rolar um pouco.
      const a = await screenOf(page, [4, 0]);
      await page.touchscreen.tap(a.x, a.y);
      const b = await screenOf(page, [7, 3]);
      await page.touchscreen.tap(b.x, b.y);
    } else {
      await drag(page, [4, 0], [7, 3]);
    }
    await panel.getByLabel("Tipo").selectOption("quarto");
    await expect(panel.getByLabel("Nome")).toHaveValue("Quarto");
    await expect(page.getByTestId("plan-room")).toHaveCount(2);

    // 3) Mover o quarto 1 m para a esquerda: fica em cima da sala.
    await drag(page, [5.5, 1.5], [4.5, 1.5]);
    await expect(page.getByTestId("plan-overlap")).toContainText(
      "um em cima do outro",
    );
    await expect(page.getByTestId("plan-save")).toBeDisabled();
    // Desfazer volta para o lugar.
    await page.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByTestId("plan-overlap")).toHaveCount(0);

    // 4) Aumentar o quarto para cima (bolinha de cima): 3 → 4 m.
    await page.getByTestId("plan-room").filter({ hasText: "Quarto" }).click();
    await expect(panel.getByLabel("Nome")).toHaveValue("Quarto");
    const top = await screenOf(page, [5.5, 3]);
    const to = await screenOf(page, [5.5, 4]);
    await page.mouse.move(top.x, top.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await expect(page.getByTestId("plan-measure")).toContainText("3 × 4 m");
    await page.mouse.up();

    // Acessibilidade do editor (WCAG 2 A/AA).
    const axe = await new AxeBuilder({ page })
      .include('[data-testid="plan-editor"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    // 5) Salvar a planta inteira.
    await page.getByTestId("plan-save").click();
    await expect(page.getByText("Planta salva.")).toBeVisible({
      timeout: 15_000,
    });
    const saved = querySql<{ nome: string; tipo: string; pontos: string }>(
      `select nome, tipo::text, (geometria->'pontos')::text as pontos
         from public.comodos where tipologia_id = '${typologyId}' order by ordem`,
    );
    expect(saved).toEqual([
      {
        nome: "Sala",
        tipo: "sala",
        pontos: "[[0, 0], [4, 0], [4, 3], [0, 3]]",
      },
      {
        nome: "Quarto",
        tipo: "quarto",
        pontos: "[[4, 0], [7, 0], [7, 4], [4, 4]]",
      },
    ]);

    // Depois de salvar, a aba "Medidas" mostra os mesmos cômodos.
    await page.getByRole("tab", { name: "Medidas" }).click();
    await expect(page.getByTestId("room-item")).toHaveCount(2);

    // 6) Outra aba criou um cômodo: salvar a planta antiga NÃO apaga ele.
    runSql(
      `insert into public.comodos (tipologia_id, nome, tipo, geometria, area_m2)
       values ('${typologyId}', 'Banheiro outra aba', 'banheiro',
         '{"tipo":"poligono","pontos":[[8,0],[10,0],[10,2],[8,2]],"pe_direito":2.7}', 4)`,
    );
    await page.getByRole("tab", { name: "Desenhar" }).click();
    await page.getByTestId("plan-room").filter({ hasText: "Sala" }).click();
    await page.keyboard.press("ArrowUp"); // sobe a sala 10 cm
    await page.getByTestId("plan-save").click();
    await expect(page.getByText("A planta mudou em outra aba")).toBeVisible({
      timeout: 15_000,
    });
    expect(
      querySql<{ n: number }>(
        `select count(*)::int as n from public.comodos where tipologia_id = '${typologyId}'`,
      )[0].n,
    ).toBe(3);
  });
});
