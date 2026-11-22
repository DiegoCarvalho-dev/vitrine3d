import { describe, expect, it } from "vitest";

import { leadContextSchema, leadSchema } from "./lead";

const valid = {
  name: "  Maria Souza ",
  phone: "(11) 98888-7777",
  email: "",
  message: "",
  consent: true,
  unitId: "",
  website: "",
};

describe("formulário de interesse", () => {
  it("aceita nome e telefone; normaliza", () => {
    const lead = leadSchema.parse(valid);
    expect(lead).toMatchObject({
      name: "Maria Souza",
      phone: "+5511988887777",
      email: null,
      message: null,
      unitId: null,
    });
  });

  it("aceita só e-mail (minúsculo)", () => {
    expect(
      leadSchema.parse({ ...valid, phone: "", email: "Maria@Exemplo.com" })
        .email,
    ).toBe("maria@exemplo.com");
  });

  it("precisa de telefone ou e-mail", () => {
    const result = leadSchema.safeParse({ ...valid, phone: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("telefone ou um e-mail");
  });

  it("mostra o consentimento junto com outros erros", () => {
    const result = leadSchema.safeParse({ ...valid, name: "", consent: false });
    const paths = result.error?.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["name", "consent"]));
  });

  it("aba aberta há dias: tempo grande não vira robô", () => {
    const context = leadContextSchema.parse({
      projectId: "0d3e0000-0000-4000-8000-000000000001",
      origin: null,
      sessionId: null,
      fillMs: 172_800_000,
    });
    expect(context.fillMs).toBe(86_400_000);
  });

  it("sem consentimento não envia", () => {
    const result = leadSchema.safeParse({ ...valid, consent: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("concorda");
  });

  it("recusa telefone e e-mail inválidos e textos longos", () => {
    expect(leadSchema.safeParse({ ...valid, phone: "123" }).success).toBe(
      false,
    );
    expect(
      leadSchema.safeParse({ ...valid, email: "nao-e-email" }).success,
    ).toBe(false);
    expect(
      leadSchema.safeParse({ ...valid, name: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      leadSchema.safeParse({ ...valid, message: "x".repeat(2001) }).success,
    ).toBe(false);
  });

  it("contexto: origem do link limpa e sessão inválida vira null", () => {
    const context = leadContextSchema.parse({
      projectId: "0d3e0000-0000-4000-8000-000000000001",
      origin: "instagram",
      sessionId: "<script>",
      fillMs: 8_000,
    });
    expect(context.origin).toBe("instagram");
    expect(context.sessionId).toBeNull();
    expect(
      leadContextSchema.parse({
        projectId: "0d3e0000-0000-4000-8000-000000000001",
        origin: "<img src=x onerror=alert(1)>",
        sessionId: null,
        fillMs: 8_000,
      }).origin,
    ).toBeNull();
  });
});
