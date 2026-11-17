import { spawnSync } from "node:child_process";

// Depois dos testes e2e: apaga os usuários criados pelo teste de cadastro
// (e-mails e2e-...@exemplo.test) no projeto de DESENVOLVIMENTO. Apagar o
// usuário apaga o perfil em cascata. Só toca nesses e-mails de teste.
export default function globalTeardown() {
  const sql = "delete from auth.users where email like 'e2e-%@exemplo.test'";
  const result = spawnSync(
    "supabase",
    ["db", "query", "--remote", "--yes", sql],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    console.warn(
      "[teardown] Não consegui apagar os usuários de teste (Supabase CLI ligada ao projeto?).\n" +
        "Apague à mão no painel: Authentication > Users, e-mails e2e-...@exemplo.test",
    );
  }
}
