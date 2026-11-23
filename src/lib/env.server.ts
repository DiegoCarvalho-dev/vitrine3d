import "server-only";

import { z } from "zod";

// Server-only secrets (issue #70). NEVER with the NEXT_PUBLIC_ prefix: they
// stay on the server and never reach the browser. Both are optional: without
// them the site works and leads are saved, only the e-mail isn't sent.

const serverEnvSchema = z.object({
  // Supabase secret key (sb_secret_...): reads the broker's e-mail and the
  // visit summary, which the anonymous visitor can't.
  SUPABASE_SECRET_KEY: z
    .string()
    .startsWith(
      "sb_secret_",
      "SUPABASE_SECRET_KEY deve começar com sb_secret_.",
    )
    .optional(),
  // Resend (https://resend.com) API key: re_...
  RESEND_API_KEY: z
    .string()
    .startsWith("re_", "RESEND_API_KEY deve começar com re_.")
    .optional(),
  // Sender. Without an own domain at Resend, only its test sender works (and
  // it only delivers to the Resend account's own e-mail).
  EMAIL_FROM: z.string().min(3).default("Vitrine 3D <onboarding@resend.dev>"),
});

export type EmailEnv = {
  secretKey: string;
  resendKey: string;
  from: string;
};

/**
 * The Supabase secret key, or null when it isn't configured (#84: without
 * it the site can't save leads or events, but the tour still works).
 */
export function getSecretKey(
  source: Record<string, string | undefined> = process.env,
): string | null {
  const key = source.SUPABASE_SECRET_KEY;
  if (!key) return null;
  if (!key.startsWith("sb_secret_")) {
    console.error("SUPABASE_SECRET_KEY deve começar com sb_secret_.");
    return null;
  }
  return key;
}

/** The e-mail settings, or null when a key is missing (e-mail off). */
export function getEmailEnv(
  source: Record<string, string | undefined> = process.env,
): EmailEnv | null {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY || undefined,
    RESEND_API_KEY: source.RESEND_API_KEY || undefined,
    EMAIL_FROM: source.EMAIL_FROM || undefined,
  });
  if (!parsed.success) {
    // A key in the wrong format: say which (never its value) and stay off.
    console.error(
      `E-mail de leads desligado: ${parsed.error.issues.map((i) => i.message).join(" ")}`,
    );
    return null;
  }
  const { SUPABASE_SECRET_KEY, RESEND_API_KEY, EMAIL_FROM } = parsed.data;
  if (!SUPABASE_SECRET_KEY || !RESEND_API_KEY) return null;
  return {
    secretKey: SUPABASE_SECRET_KEY,
    resendKey: RESEND_API_KEY,
    from: EMAIL_FROM,
  };
}
