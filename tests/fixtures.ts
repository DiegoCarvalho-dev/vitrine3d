import { existsSync } from "node:fs";

import { test as base } from "@playwright/test";

import { sessionFile } from "./global-setup";

/** Os testes que precisam do Supabase são pulados sem .env.local. */
export const hasSupabaseEnv =
  existsSync(".env.local") ||
  (!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/**
 * Teste que já começa LOGADO com o corretor de sessão do projeto
 * (desktop ou celular), criado no tests/global-setup.ts.
 */
export const loggedInTest = base.extend({
  // O Playwright exige o objeto de fixtures no 1º parâmetro, mesmo vazio.
  storageState: async ({}, provide, testInfo) => {
    await provide(sessionFile(testInfo.project.name));
  },
});
