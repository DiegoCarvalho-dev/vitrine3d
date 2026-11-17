// npm run db:seed:gerar → validates the demo JSON and writes supabase/seed.sql.
// (A separate entry file: the generator module never writes when imported.)
import { writeFileSync } from "node:fs";

import { generateSeedSql, readSeedData, SEED_SQL_URL } from "./gerar-seed.mjs";

try {
  writeFileSync(SEED_SQL_URL, generateSeedSql(readSeedData()));
  console.log("supabase/seed.sql gerado.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
