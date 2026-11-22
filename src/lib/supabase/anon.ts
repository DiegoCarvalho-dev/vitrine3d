import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente ANÔNIMO para as páginas públicas (tour `/e/[slug]`): não lê nem
 * grava cookies, então mesmo um corretor logado consulta como visitante.
 * Por quê: o GRANT por coluna vale para o papel inteiro; com o papel
 * `authenticated`, um corretor leria o `preco` "sob consulta" de outro
 * (docs/03, "Corretor logado vê só as próprias unidades").
 */
export function createAnonClient() {
  const env = getPublicEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
