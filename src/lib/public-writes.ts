import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSecretKey } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

// What the public tour writes (leads and visit events) goes through the
// SERVER (issue #84): the visitor's public key can no longer insert anything.
// The server validates first (Zod), checks the target here, applies the
// per-IP limit kept in the database, and saves with the secret key. The
// database still refuses unpublished projects and rooms of another project
// (trigger), whoever writes.

export type Writer = {
  client: SupabaseClient<Database>;
  secretKey: string;
};

/** The server's writer, or null when the secret key isn't configured. */
export function getWriter(): Writer | null {
  const secretKey = getSecretKey();
  return secretKey ? { client: createAdminClient(secretKey), secretKey } : null;
}

/**
 * The visitor's IP as the host platform reports it (Vercel sets x-real-ip).
 * Unknown (local development): null, and only the per-session limit applies.
 */
export function clientIp(headers: Headers): string | null {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

/**
 * A summary of the IP (HMAC with the secret key): the same IP always gives
 * the same key, but the IP itself is never stored and can't be recovered.
 */
export function ipKey(ip: string, secretKey: string, scope = ""): string {
  return createHmac("sha256", secretKey)
    .update(`${scope}|${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Counts a submission against a per-IP limit kept in the database (valid for
 * every server instance). Fails closed: if the check can't run, it says no.
 */
export async function allowByIp(
  writer: Writer,
  {
    ip,
    scope,
    limit,
    windowSeconds,
    keyScope = "",
  }: {
    ip: string | null;
    scope: "lead" | "evento";
    limit: number;
    windowSeconds: number;
    /** Extra part of the key (e.g. the project: the limit is per tour). */
    keyScope?: string;
  },
): Promise<boolean> {
  if (!ip) return true; // no IP known: the per-session limit still applies
  const { data, error } = await writer.client.rpc("registrar_envio", {
    p_escopo: scope,
    p_chave: ipKey(ip, writer.secretKey, keyScope),
    p_limite: limit,
    p_janela_segundos: windowSeconds,
  });
  return !error && data === true;
}
