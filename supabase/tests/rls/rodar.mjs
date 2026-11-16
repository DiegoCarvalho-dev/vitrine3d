// Roda os testes de RLS (supabase/tests/rls/*.sql) no projeto ligado
// (vitrine3d-dev). Cada teste roda numa transação desfeita no fim: não deixa
// dados no banco. Os cenários de cada teste estão descritos no próprio .sql.
//
// O banco devolve um resumo "total=N;ok=N;falhas=...;FIM". Só aprovamos se o
// marcador FIM chegou (a CLI corta mensagens longas) e se ok == total.
//
// Uso: npm run test:rls   (precisa do `supabase login` + `supabase link`)
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join("supabase", "tests", "rls");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const SUMMARY = /RELATORIO_RLS:total=(\d+);ok=(\d+);falhas=(.*?);FIM/s;

let failed = 0;
for (const file of files) {
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
