import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

/**
 * Cliente do Supabase para Client Components ("use client"), roda no navegador.
 * O createBrowserClient reaproveita uma única instância (singleton).
 * Baseado no exemplo oficial: supabase/examples/auth/nextjs.
 */
export function createClient() {
  const env = getPublicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
