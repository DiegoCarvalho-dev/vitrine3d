import { existsSync } from "node:fs";

import { test as base } from "@playwright/test";

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
