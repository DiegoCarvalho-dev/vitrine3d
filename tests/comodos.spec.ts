import { expect, type Page } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
} from "./fixtures";

// Cômodos com prévia 2D da planta (issue #32). Usa o corretor já logado.

async function fillRoom(
  page: Page,
  room: {
    name: string;
    type?: string;
    x: string;
    y: string;
    width: string;
    depth: string;
  },
) {
  const form = page.getByRole("form");
  await form.getByLabel("Nome").fill(room.name);
  if (room.type) await form.getByLabel("Tipo").selectOption(room.type);
  await form.getByLabel("X (m)").fill(room.x);
  await form.getByLabel("Y (m)").fill(room.y);
  await form.getByLabel("Largura (m)").fill(room.width);
  await form.getByLabel("Profundidade (m)").fill(room.depth);
  return form;
}

test.describe("Cômodos e prévia da planta", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(120_000);

  test("cria sala e quarto, recusa banheiro sobreposto, edita e reordena", async ({
    page,
  }, testInfo) => {
    await createBuilding(
      page,
      `Cômodos ${Date.now()} ${testInfo.project.name}`,
    );

    // Tipologia com área privativa de 30 m².
    await page.getByRole("button", { name: "Nova tipologia" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome").fill("Tipo A");
    await dialog.getByLabel("Área privativa (m²)").fill("30");
    await dialog.getByRole("button", { name: "Criar tipologia" }).click();
    await expect(page.getByText("Tipologia criada.")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("link", { name: "Cômodos" }).click();
    await expect(
      page.getByRole("heading", { name: "Tipo A", level: 1 }),
    ).toBeVisible({
      timeout: 30_000,
    });

    // Sala (0; 0; 5 × 4) — sem cômodos, o formulário já vem aberto.
    let form = await fillRoom(page, {
      name: "Sala",
      x: "0",
      y: "0",
      width: "5",
      depth: "4",
    });
    await expect(page.getByTestId("room-draft-info")).toHaveText("Área: 20 m²");
    await form.getByRole("button", { name: "Adicionar cômodo" }).click();
    await expect(page.getByText("Cômodo criado.")).toBeVisible({
      timeout: 15_000,
    });

    // Quarto (5; 0; 3 × 3), com vírgula.
    await page.getByRole("button", { name: "Novo cômodo" }).click();
    form = await fillRoom(page, {
      name: "Quarto",
      type: "quarto",
      x: "5",
      y: "0",
      width: "3,0",
      depth: "3",
    });
    await form.getByRole("button", { name: "Adicionar cômodo" }).click();
    await expect(page.getByTestId("room-item")).toHaveCount(2, {
      timeout: 15_000,
    });

    // A prévia mostra os dois, com nome e área.
    const preview = page.getByTestId("floor-plan-preview");
    await expect(preview.getByTestId("floor-plan-room")).toHaveCount(2);
    await expect(preview).toContainText("Sala");
    await expect(preview).toContainText("20 m²");
    await expect(preview).toContainText("9 m²");
    await expect(page.getByTestId("area-summary")).toContainText(
      "29 m² de 30 m²",
    );

    // Prévia em 3D (#48): troca a planta pelo modelo e volta.
    await page.getByRole("button", { name: "Ver em 3D" }).click();
    await expect(
      page.getByTestId("unit-preview-3d").locator("canvas"),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Planta", exact: true }).click();
    await expect(preview).toBeVisible();

    // Banheiro em cima da sala: recusado antes de salvar.
    await page.getByRole("button", { name: "Novo cômodo" }).click();
    form = await fillRoom(page, {
      name: "Banheiro",
      type: "banheiro",
      x: "1",
      y: "1",
      width: "2",
      depth: "2",
    });
    await expect(page.getByTestId("room-draft-info")).toContainText(
      "Fica em cima de “Sala”",
    );
    await expect(
      form.getByRole("button", { name: "Adicionar cômodo" }),
    ).toBeDisabled();
    await expect(page.getByTestId("floor-plan-draft")).toBeVisible();
    await form.getByRole("button", { name: "Cancelar" }).click();

    // Edita o quarto: 3,5 m de largura → 10,5 m² e aviso de área.
    await page
      .getByTestId("room-item")
      .filter({ hasText: "Quarto" })
      .getByRole("button", { name: "Editar" })
      .click();
    await page.getByRole("form").getByLabel("Largura (m)").fill("3,5");
    await page
      .getByRole("form")
      .getByRole("button", { name: "Salvar cômodo" })
      .click();
    await expect(page.getByText("Cômodo salvo.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByTestId("room-item").filter({ hasText: "Quarto" }),
    ).toContainText("10,5 m²");
    await expect(page.getByText("passou da área privativa")).toBeVisible();

    // Reordena: o quarto sobe para o primeiro lugar.
    await page.getByRole("button", { name: "Subir Quarto" }).click();
    await expect(page.getByTestId("room-item").first()).toContainText(
      "Quarto",
      {
        timeout: 15_000,
      },
    );

    // Excluir pede confirmação.
    await page
      .getByTestId("room-item")
      .filter({ hasText: "Sala" })
      .getByRole("button", { name: "Excluir" })
      .click();
    await page.getByRole("button", { name: "Excluir cômodo" }).click();
    await expect(page.getByTestId("room-item")).toHaveCount(1, {
      timeout: 15_000,
    });
  });
});
