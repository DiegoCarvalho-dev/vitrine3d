// Roda os testes de RLS (supabase/tests/rls/*.sql) no projeto ligado
// (vitrine3d-dev). Cada teste roda numa transação desfeita no fim: não deixa
// dados no banco. Os cenários de cada teste estão descritos no próprio .sql.
//
// O banco devolve um resumo "total=N;ok=N;falhas=...;FIM". Só aprovamos se o
// marcador FIM chegou (a CLI corta mensagens longas) e se ok == total.
//
// Uso: npm run test:rls   (precisa do `supabase login` + `supabase link`)
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Trava de segurança: o teste roda no banco de verdade (vitrine3d-dev), então
 * só é enviado se tiver o formato que garante "desfazer tudo no fim":
 * - um único bloco `do $$ ... $$;` (nada fora dele);
 * - terminar com `raise exception 'RELATORIO_RLS:...` (que desfaz a transação);
 * - sem `commit`/`rollback` (num bloco do, um commit gravaria dados de verdade).
 * Devolve o motivo da recusa, ou null se o arquivo estiver no formato.
 */
function unsafeReason(sql) {
  const code = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
  if (!/^do \$\$/i.test(code) || !/\$\$;$/.test(code)) {
    return "precisa ser um único bloco `do $$ ... $$;`";
  }
  if ((code.match(/\$\$/g) ?? []).length !== 2) {
    return "precisa ter um único bloco `do $$ ... $$;`";
  }
  if (!/raise exception 'RELATORIO_RLS:total=%;ok=%;falhas=%;FIM'/.test(code)) {
    return "precisa terminar com o `raise exception 'RELATORIO_RLS:...'` que desfaz a transação";
  }
  if (/\b(commit|rollback)\b/i.test(code)) {
    return "não pode ter commit/rollback";
  }
  return null;
}

const dir = join("supabase", "tests", "rls");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const SUMMARY = /RELATORIO_RLS:total=(\d+);ok=(\d+);falhas=(.*?);FIM/s;

let failed = 0;
for (const file of files) {
  const reason = unsafeReason(readFileSync(join(dir, file), "utf8"));
  if (reason) {
    console.error(`✗ ${file}: NÃO enviado ao banco: ${reason}`);
    failed++;
    continue;
  }

  const result = spawnSync(
    "supabase",
    ["db", "query", "--remote", "--yes", "-f", join(dir, file)],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const match = output.match(SUMMARY);

  if (!match) {
    console.error(
      `✗ ${file}: resumo não encontrado (o teste quebrou antes do fim?)`,
    );
    console.error(output.slice(0, 2000));
    failed++;
    continue;
  }

  const total = Number(match[1]);
  const ok = Number(match[2]);
  const failures = match[3].replace(/\\+n|\\+"/g, " ").trim();
  const passed = total > 0 && ok === total;

  console.log(`${passed ? "✓" : "✗"} ${file}: ${ok}/${total} cenários OK`);
  if (!passed) {
    console.log(`   falhas: ${failures || "(sem descrição)"}`);
    failed++;
  }
}

console.log(failed ? `\n${failed} arquivo(s) com falha` : "\nRLS: tudo OK");
process.exit(failed ? 1 : 0);
