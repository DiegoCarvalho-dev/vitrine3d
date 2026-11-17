import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./auth";

describe("signUpSchema", () => {
  const valid = {
    name: "Ana Corretora",
    email: "ana@exemplo.com",
    password: "senha-forte-1",
  };

  it("aceita um cadastro válido e normaliza o e-mail", () => {
    const parsed = signUpSchema.parse({
      ...valid,
      email: "  ANA@Exemplo.COM ",
    });
    expect(parsed.email).toBe("ana@exemplo.com");
  });

  it("recusa senha com menos de 8 caracteres", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "1234567" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/8 caracteres/);
  });

  it("recusa senha acima do limite de 72 caracteres", () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: "a".repeat(73) }).success,
    ).toBe(false);
  });

  it("recusa e-mail inválido", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "ana@" }).success).toBe(
      false,
    );
  });

  it("recusa nome vazio (só espaços)", () => {
    expect(signUpSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
  });
});

describe("signInSchema", () => {
  it("aceita e-mail e senha", () => {
    expect(
      signInSchema.safeParse({ email: "ana@exemplo.com", password: "x" })
        .success,
    ).toBe(true);
  });

  it("recusa senha vazia", () => {
    expect(
      signInSchema.safeParse({ email: "ana@exemplo.com", password: "" })
        .success,
    ).toBe(false);
  });
});
