import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { test as base, expect, type Page } from "@playwright/test";

import { dbTargetArgs, execSql } from "./db-target";
import { hasSupabaseEnv, sessionFile } from "./global-setup";

export { hasSupabaseEnv };

/**
 * Teste que já começa LOGADO com o corretor de sessão do projeto
 * (desktop ou celular), criado no tests/global-setup.ts. Sem a sessão
 * (sem chaves ou sem a CLI do Supabase), o teste é pulado.
 */
export const loggedInTest = base.extend({
  storageState: async ({}, provide, testInfo) => {
    const file = sessionFile(testInfo.project.name);
    testInfo.skip(
      !existsSync(file),
      "Sem sessão de teste (veja o aviso do setup).",
    );
    await provide(file);
  },
});

/**
 * Roda SQL no projeto ligado à CLI (o de DESENVOLVIMENTO), sem passar pelo
 * RLS. Só para montar cenários que a tela ainda não permite (ex.: um lead).
 */
export function runSql(sql: string) {
  const result = execSql(sql);
  if (result.error || result.status !== 0) {
    throw new Error(
      `Falha ao rodar SQL de teste: ${result.stderr ?? ""}${result.stdout ?? ""}`.slice(
        0,
        2_000,
      ),
    );
  }
}

/**
 * Cria um prédio pela tela e devolve o id (da URL de edição).
 * Digita o nome até o link aparecer: prova que o formulário já está ativo.
 */
export async function createBuilding(page: Page, name: string) {
  await page.goto("/painel");
  await page.getByRole("link", { name: "Novo empreendimento" }).click();
  // 30 s: in dev the page may be compiling for the first time.
  await expect(page).toHaveURL(/\/novo$/, { timeout: 30_000 });
  await expect(async () => {
    await page.getByLabel("Nome do empreendimento").fill(name);
    await expect(page.getByTestId("slug-preview")).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 15_000 });
  await page.getByLabel("Cidade").fill("Campinas");
  await page.getByLabel("Andares", { exact: true }).fill("6");
  await page.getByLabel("Unidades por andar", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Criar empreendimento" }).click();
  await expect(page).toHaveURL(/\/painel\/empreendimentos\/[0-9a-f-]{36}$/, {
    timeout: 20_000,
  });
  const id = page.url().split("/").pop() ?? "";
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  return id;
}

/** Consulta só de leitura no banco de DESENVOLVIMENTO (para conferir o efeito da tela). */
export function querySql<Row>(sql: string): Row[] {
  const result = spawnSync(
    "supabase",
    [
      "db",
      "query",
      ...dbTargetArgs,
      "--read-only",
      "--output-format",
      "json",
      sql,
    ],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`Falha na consulta de teste: ${result.stderr ?? ""}`);
  }
  // The CLI prints a plain list of rows, or { rows } when it detects an AI
  // agent running it (with an "untrusted data" warning): accept both.
  const parsed = JSON.parse(result.stdout) as Row[] | { rows: Row[] };
  return Array.isArray(parsed) ? parsed : parsed.rows;
}

/** URL e chave pública do Supabase (as mesmas que o navegador usa). */
export function publicSupabase() {
  const fromFile = existsSync(".env.local")
    ? Object.fromEntries(
        readFileSync(".env.local", "utf8")
          .split(/\r?\n/)
          .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/))
          .filter((m): m is RegExpMatchArray => m !== null)
          .map((m) => [m[1], m[2]]),
      )
    : {};
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? fromFile.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    fromFile.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltam as chaves públicas do Supabase.");
  return { url: url.replace(/\/$/, ""), key };
}

/**
 * Gera no navegador uma "foto" PNG grande (3000x2000, degradê com granulado),
 * parecida com a de um celular: vários MB antes da compressão.
 */
export async function bigPhoto(page: Page, hue: number) {
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
