import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicEnv } from "@/lib/env";

/**
 * Cliente do Supabase para o servidor: Server Components, Server Actions e Route Handlers.
 * Crie um novo a cada requisição (ele lê os cookies daquela requisição).
 * Baseado no exemplo oficial: supabase/examples/auth/nextjs.
 */
export async function createClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component, que não pode gravar cookies.
            // Pode ser ignorado: o proxy.ts (Sprint 2, login) renova a sessão.
          }
        },
      },
    },
  );
}
