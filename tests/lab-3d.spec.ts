import { expect, type Page, test } from "@playwright/test";

const UNIT_TEXT = /Unidade \d{3,4}: (disponível|reservado|vendido), \d+º andar/;

async function openBuilding(page: Page) {
  await page.goto("/lab/3d");
  // O 3D carrega só no navegador (dynamic + ssr:false); espera o canvas aparecer.
  const canvas = page.getByTestId("building-3d").locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  return canvas;
}

test.describe("Lab: prédio 3D", () => {
  test("carrega o prédio sem erros no console", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await openBuilding(page);
    await expect(page.getByText("Disponível (16)")).toBeVisible();
    // O aviso fica dentro do <canvas> e só aparece se o WebGL não existir.
    await expect(page.getByText("WebGL indisponível")).toBeHidden();

    expect(errors).toEqual([]);
  });

  test("tocar/clicar no prédio identifica uma unidade", async ({
    page,
    isMobile,
  }) => {
    const canvas = await openBuilding(page);
    const status = page.getByTestId("selected-unit");
    await expect(status).toContainText("Toque ou clique");

    // O centro da tela cai numa unidade do meio do prédio.
    if (isMobile) {
      await canvas.tap();
    } else {
      await canvas.click();
    }

    await expect(status).toHaveText(UNIT_TEXT);
  });

  test("arrastar para girar não seleciona unidade", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Arrasto com mouse; o toque é coberto no teste acima.");
    const canvas = await openBuilding(page);
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas sem tamanho");

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy + 10, { steps: 8 });
    await page.mouse.up();

    await expect(page.getByTestId("selected-unit")).toContainText(
      "Toque ou clique",
    );
  });
});
