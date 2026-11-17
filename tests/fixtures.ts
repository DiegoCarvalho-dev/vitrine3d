import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { test as base, expect, type Page } from "@playwright/test";

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
  const result = spawnSync(
    "supabase",
    ["db", "query", "--remote", "--yes", sql],
    {
      encoding: "utf8",
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`Falha ao rodar SQL de teste: ${result.stderr ?? ""}`);
  }
}

/**
 * Cria um prédio pela tela e devolve o id (da URL de edição).
 * Digita o nome até o link aparecer: prova que o formulário já está ativo.
 */
export async function createBuilding(page: Page, name: string) {
  await page.goto("/painel");
  await page.getByRole("link", { name: "Novo empreendimento" }).click();
  await expect(page).toHaveURL(/\/novo$/);
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
    ["db", "query", "--remote", "--read-only", "--output-format", "json", sql],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) {
    throw new Error(`Falha na consulta de teste: ${result.stderr ?? ""}`);
  }
  return (JSON.parse(result.stdout) as { rows: Row[] }).rows;
}
