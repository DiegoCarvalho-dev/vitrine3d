import { execSql } from "./db-target";

// Depois dos testes e2e: apaga os usuários criados pelo teste de cadastro
// (e-mails e2e-...@exemplo.test) no projeto ligado à CLI (o de DESENVOLVIMENTO).
// Apagar o usuário apaga o perfil em cascata. Só toca nesses e-mails de teste.
export const CLEANUP_SQL =
  "delete from auth.users where email like 'e2e-%@exemplo.test'";

export default function globalTeardown() {
  // Sem shell: os argumentos chegam inteiros à CLI (com shell: true no Windows,
  // o SQL seria quebrado em vários argumentos e a limpeza nunca rodaria).
  const result = execSql(CLEANUP_SQL);
  if (result.error || result.status !== 0) {
    console.warn(
      "[teardown] Não consegui apagar os usuários de teste (Supabase CLI instalada e ligada ao projeto?).\n" +
        "Apague à mão no painel: Authentication > Users, e-mails e2e-...@exemplo.test",
    );
  }
}
