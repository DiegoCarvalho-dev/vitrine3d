import { z } from "zod";

// Variáveis públicas do Supabase. O prefixo NEXT_PUBLIC_ faz o Next.js
// colocá-las no código do navegador, então aqui NUNCA entram segredos
// (a service role / secret key fica só no servidor e nunca com esse prefixo).
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url({ message: "NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL válida." })
    .refine(
      (value) =>
        value.startsWith("https://") ||
        value.includes("localhost") ||
        value.includes("127.0.0.1"),
      {
        message: "NEXT_PUBLIC_SUPABASE_URL precisa usar https.",
      },
    ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY está vazia.")
    .refine((value) => !value.startsWith("sb_secret_"), {
      message:
        "Isto é uma SECRET key. Use a publishable key (sb_publishable_...) no NEXT_PUBLIC_.",
    }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Lê e valida as variáveis públicas do Supabase.
 * O Next.js só substitui process.env.NEXT_PUBLIC_* no navegador quando o nome
 * aparece escrito por extenso, por isso cada variável é lida explicitamente.
 */
export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Variáveis de ambiente do Supabase inválidas (veja .env.example):\n${problems}`,
    );
  }

  return result.data;
}
