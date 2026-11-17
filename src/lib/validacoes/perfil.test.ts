import { describe, expect, it } from "vitest";

import {
  contrastWithWhite,
  formatPhone,
  profileSchema,
  toE164,
} from "./perfil";

describe("toE164 (WhatsApp)", () => {
  it.each([
    ["(11) 99999-9999", "+5511999999999"],
    ["11 99999 9999", "+5511999999999"],
    ["11999999999", "+5511999999999"],
    ["+55 11 99999-9999", "+5511999999999"],
    ["5511999999999", "+5511999999999"],
    ["(21) 3333-4444", "+552133334444"], // fixo, 8 dígitos
    ["+1 415 555 2671", "+14155552671"], // outro país, com +
  ])("%s → %s", (typed, expected) => {
    expect(toE164(typed)).toBe(expected);
  });

  it.each([
    ["99999-9999"], // sem DDD
    ["(01) 99999-9999"], // DDD inexistente
    ["(11) 89999-9999"], // celular de 9 dígitos que não começa com 9
    ["abc"],
    ["123"],
  ])("recusa %s", (typed) => {
    expect(toE164(typed)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("mostra o número brasileiro no formato de leitura", () => {
    expect(formatPhone("+5511999999999")).toBe("(11) 99999-9999");
    expect(formatPhone("+552133334444")).toBe("(21) 3333-4444");
  });

  it("deixa outros países como estão", () => {
    expect(formatPhone("+14155552671")).toBe("+14155552671");
  });

  it("vazio vira campo vazio", () => {
    expect(formatPhone(null)).toBe("");
  });
});

describe("profileSchema", () => {
  const valid = {
    name: "Ana Corretora",
    whatsapp: "(11) 99999-9999",
    creci: "CRECI-SP 123456",
    brandColor: "#1B365D",
    notifyLeadsByEmail: true,
  };

  it("normaliza o que vai para o banco", () => {
    expect(profileSchema.parse(valid)).toEqual({
      name: "Ana Corretora",
      whatsapp: "+5511999999999",
      creci: "CRECI-SP 123456",
      brandColor: "#1b365d",
      notifyLeadsByEmail: true,
    });
  });

  it("WhatsApp e CRECI vazios viram null (não informados)", () => {
    const parsed = profileSchema.parse({ ...valid, whatsapp: " ", creci: "" });
    expect(parsed.whatsapp).toBeNull();
    expect(parsed.creci).toBeNull();
  });

  it("recusa WhatsApp inválido com mensagem clara", () => {
    const result = profileSchema.safeParse({ ...valid, whatsapp: "9999-9999" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/DDD/);
  });

  it("recusa CRECI acima de 30 caracteres", () => {
    expect(
      profileSchema.safeParse({ ...valid, creci: "x".repeat(31) }).success,
    ).toBe(false);
  });

  it("recusa cor fora do formato #RRGGBB", () => {
    expect(
      profileSchema.safeParse({ ...valid, brandColor: "azul" }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...valid, brandColor: "#fff" }).success,
    ).toBe(false);
  });

  it("aplicar o esquema duas vezes dá o mesmo resultado (servidor revalida)", () => {
    const once = profileSchema.parse(valid);
    expect(
      profileSchema.parse({
        ...once,
        whatsapp: once.whatsapp ?? "",
        creci: once.creci ?? "",
      }),
    ).toEqual(once);
  });
});

describe("contrastWithWhite", () => {
  it("azul-tinta tem contraste alto com texto branco", () => {
    expect(contrastWithWhite("#1b365d")).toBeGreaterThan(7);
  });

  it("amarelo-claro tem contraste baixo", () => {
    expect(contrastWithWhite("#ffe066")).toBeLessThan(3);
  });
});
