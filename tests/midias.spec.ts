import { expect, type Page } from "@playwright/test";

import {
  createBuilding,
  hasSupabaseEnv,
  loggedInTest as test,
  querySql,
} from "./fixtures";

// Capa do empreendimento, foto e logo do corretor (issue #30). Usa o corretor
// já logado do tests/global-setup.ts; os arquivos do Storage são conferidos
// direto no banco de desenvolvimento.

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Gera no navegador uma "foto" PNG grande (3000x2000, degradê com granulado),
 * parecida com a de um celular: vários MB antes da compressão.
 */
async function bigPhoto(page: Page, hue: number) {
  const base64 = await page.evaluate((h) => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 2000;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 3000, 2000);
    gradient.addColorStop(0, `hsl(${h} 60% 70%)`);
    gradient.addColorStop(1, `hsl(${h + 60} 50% 30%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 3000, 2000);
    const pixels = ctx.getImageData(0, 0, 3000, 2000);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 24;
      pixels.data[i] += grain;
      pixels.data[i + 1] += grain;
      pixels.data[i + 2] += grain;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/png").split(",")[1];
  }, hue);
  return {
    name: `foto-${hue}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

type StoredFile = { name: string; size: number };
const filesIn = (folder: string) =>
  querySql<StoredFile>(
    `select name, (metadata->>'size')::int as size from storage.objects where bucket_id = 'midias' and name like '${folder}/%'`,
  );

test.describe("Imagens: capa, foto e logo", () => {
  test.skip(!hasSupabaseEnv, "Sem .env.local com as chaves do Supabase.");
  test.setTimeout(120_000);

  test("envia a capa comprimida, troca sem deixar órfão e remove", async ({
    page,
  }, testInfo) => {
    const name = `Capa ${Date.now()} ${testInfo.project.name}`;
    const id = await createBuilding(page, name);
    const [{ dono_id: owner }] = querySql<{ dono_id: string }>(
      `select dono_id from public.empreendimentos where id = '${id}'`,
    );
    const folder = `${owner}/${id}`;

    // 1) Envia uma foto grande: chega no Storage com menos de 2 MB.
    const first = await bigPhoto(page, 200);
    expect(first.buffer.length).toBeGreaterThan(3 * 1024 * 1024);
    await page.locator("#cover").setInputFiles(first);
    await expect(page.getByText("Capa salva.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("cover-image")).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/public\/midias\//,
    );
    let files = filesIn(folder);
    expect(files).toHaveLength(1);
    expect(files[0].size).toBeLessThan(MAX_BYTES);
    testInfo.annotations.push({
      type: "compressão",
      description: `${(first.buffer.length / 1024 / 1024).toFixed(1)} MB → ${Math.round(files[0].size / 1024)} KB`,
    });
    // A capa conta no checklist de publicação.
    await expect(page.getByTestId("publish-checklist")).toContainText(
      "Foto de capa(feito)",
    );

    // 2) Aparece no card da lista.
    await page.getByRole("link", { name: "← Meus empreendimentos" }).click();
    await expect(
      page
        .getByTestId("project-list")
        .getByRole("link")
        .filter({ hasText: name })
        .getByTestId("project-cover"),
    ).toBeVisible();
    await page
      .getByTestId("project-list")
      .getByRole("link")
      .filter({ hasText: name })
      .click();

    // 3) Troca: o arquivo antigo some do Storage.
    const oldFile = files[0].name;
    await page.locator("#cover").setInputFiles(await bigPhoto(page, 20));
    await expect
      .poll(() => filesIn(folder).map((f) => f.name), { timeout: 30_000 })
      .not.toContain(oldFile);
    files = filesIn(folder);
    expect(files).toHaveLength(1);
    const [{ capa_url: saved }] = querySql<{ capa_url: string }>(
      `select capa_url from public.empreendimentos where id = '${id}'`,
    );
    expect(saved).toBe(files[0].name);

    // 4) Remove: coluna vazia e nenhum arquivo.
    await page
      .getByTestId("cover-upload")
      .getByRole("button", { name: "Remover" })
      .click();
    await expect(page.getByText("Imagem removida.")).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(() => filesIn(folder).length, { timeout: 30_000 })
      .toBe(0);
    const [{ capa_url: removed }] = querySql<{ capa_url: string | null }>(
      `select capa_url from public.empreendimentos where id = '${id}'`,
    );
    expect(removed).toBeNull();
  });

  test("foto do corretor no perfil: envia e remove", async ({ page }) => {
    await page.goto("/painel/perfil");
    const upload = page.getByTestId("avatar-upload");
    await expect(
      upload.getByRole("button", { name: "Escolher foto" }),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page.locator("#avatar").setInputFiles(await bigPhoto(page, 120));
    await expect(page.getByText("Foto salva.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("avatar-image")).toBeVisible();

    await upload.getByRole("button", { name: "Remover" }).click();
    await expect(page.getByText("Imagem removida.")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      upload.getByRole("button", { name: "Escolher foto" }),
    ).toBeVisible();
  });
});
