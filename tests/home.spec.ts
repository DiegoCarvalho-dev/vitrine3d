import { expect, test } from "@playwright/test";

test.describe("Página inicial", () => {
  test("mostra o título e a proposta do produto", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Vitrine 3D");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Mande um link, não 30 fotos.",
      }),
    ).toBeVisible();
  });

  test("abre sem erros no console", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
  });

  test("o botão 'Ver em 3D' mostra o aviso", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Ver em 3D" }).click();

    await expect(
      page.getByText("O tour 3D da unidade 903 chega na próxima versão."),
    ).toBeVisible();
  });
});
