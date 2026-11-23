import { spawnSync, type SpawnSyncReturns } from "node:child_process";

// Which database the test helpers talk to (issue #85).
//   - default: the cloud dev project linked to the CLI (`--remote`), as before;
//   - SUPABASE_DB_LOCAL=1: the local Supabase (Docker), used by the CI with a
//     throwaway database (migrations + seed), so no real key ever goes there.
export const isLocalDb = process.env.SUPABASE_DB_LOCAL === "1";
export const dbTargetArgs: string[] = isLocalDb ? [] : ["--remote"];

// The local database container (`project_id` in supabase/config.toml).
const LOCAL_DB_CONTAINER = "supabase_db_vitrine3d";

/**
 * Runs SQL that may have several commands. The CLI sends local queries as a
 * single prepared statement (one command only), so locally the SQL goes to
 * psql inside the database container; in the cloud the CLI takes it whole.
 */
export function execSql(sql: string): SpawnSyncReturns<string> {
  if (isLocalDb) {
    return spawnSync(
      "docker",
      [
        "exec",
        "-i",
        LOCAL_DB_CONTAINER,
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
      ],
      { encoding: "utf8", input: sql },
    );
  }
  // No shell: the arguments reach the CLI whole.
  return spawnSync("supabase", ["db", "query", "--remote", "--yes", sql], {
    encoding: "utf8",
  });
}
