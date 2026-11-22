import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * ADMIN client (secret key): ignores the RLS. Only for server tasks that
 * need data the visitor can't read (issue #70: the broker's e-mail and the
 * visit summary for the new-lead e-mail). Never pass anything it reads to the
 * browser; read only the columns needed.
 */
export function createAdminClient(secretKey: string) {
  return createClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
