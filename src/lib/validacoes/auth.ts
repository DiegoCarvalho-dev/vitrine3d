import { z } from "zod";

// Shared by the forms (browser) and the Server Actions (server): the server
// never trusts what the browser already validated.

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail longo demais.")
  .pipe(z.email("Informe um e-mail válido."));

/** Broker name: same rules on sign-up and on the profile (perfis.nome, up to 120). */
export const brokerNameSchema = z
  .string()
  .trim()
  .min(2, "Informe seu nome.")
  .max(120, "Nome longo demais.");

export const signInSchema = z.object({
  email,
  // On sign-in we don't enforce the password rules (an old password may predate them).
  password: z
    .string()
    .min(1, "Informe a senha.")
    .max(72, "Senha longa demais."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: brokerNameSchema,
  email,
  // 72 = bcrypt limit used by Supabase Auth.
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres."),
});
export type SignUpInput = z.infer<typeof signUpSchema>;
