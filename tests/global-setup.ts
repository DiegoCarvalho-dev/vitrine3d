import { existsSync, mkdirSync, rmSync } from "node:fs";

import { chromium, type FullConfig } from "@playwright/test";

import { execSql } from "./db-target";

// Antes dos testes e2e: prepara UM corretor logado por projeto (desktop e
// celular) e salva a sessão em tests/.auth/<projeto>.json.
//
// Por quê: o Supabase limita cadastros e logins (cerca de 30 a cada 5 min por
// IP). Cadastrar uma conta nova em cada teste estoura o limite quando a suíte
// roda algumas vezes seguidas. Aqui os usuários são criados direto no banco
// (sem passar pelo limite) e cada um faz um único login. Só os testes que
// existem para provar o CADASTRO continuam cadastrando de verdade.
// Os usuários usam e-mails e2e-...@exemplo.test: o global-teardown apaga.

/** Os testes que precisam do Supabase são pulados sem as chaves. */
export const hasSupabaseEnv =
  existsSync(".env.local") ||
  (!!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const SESSION_PASSWORD = "senha-de-teste-123";
export const sessionEmail = (project: string) =>
  `e2e-sessao-${project}@exemplo.test`;
export const sessionFile = (project: string) => `tests/.auth/${project}.json`;

function createSessionUsers(projects: string[]) {
  const emails = projects.map((p) => `('${sessionEmail(p)}')`).join(", ");
  const sql = `
do $$
declare
  u record;
  novo uuid;
begin
  for u in select email from (values ${emails}) as v(email) loop
    if not exists (select 1 from auth.users where email = u.email) then
      novo := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', novo, 'authenticated', 'authenticated', u.email,
        extensions.crypt('${SESSION_PASSWORD}', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{"nome":"Corretor Sessão"}', now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), novo, novo::text,
        jsonb_build_object('sub', novo::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now());
    end if;
  end loop;
end
$$;`;
  const result = execSql(sql);
  if (result.error || result.status !== 0) {
    // No CI isso é erro: pular os testes com login daria um "verde" falso.
    if (process.env.CI)
      throw new Error(
        `[setup] Não consegui criar os usuários de teste no banco: ${result.stderr ?? result.error}`,
      );
    // No computador: avisa e segue. Os testes com login são pulados
    // (tests/fixtures.ts), os demais rodam normalmente.
    console.warn(
      "[setup] Não consegui criar os usuários de teste (Supabase CLI instalada e ligada ao projeto?). Os testes com login serão pulados.",
    );
    return false;
  }
  return true;
}

export default async function globalSetup(config: FullConfig) {
  // Sessões antigas saem: sem sessão nova, os testes com login são pulados.
  rmSync("tests/.auth", { recursive: true, force: true });
  if (!hasSupabaseEnv) return;
  const projects = config.projects.map((p) => p.name);
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";

  if (!createSessionUsers(projects)) return;
  mkdirSync("tests/.auth", { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const project of projects) {
      const page = await browser.newPage({ baseURL });
      await page.goto("/entrar");
      await page.getByLabel("E-mail").fill(sessionEmail(project));
      await page.getByLabel("Senha").fill(SESSION_PASSWORD);
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL(/\/painel$/, { timeout: 30_000 });
      await page.context().storageState({ path: sessionFile(project) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
