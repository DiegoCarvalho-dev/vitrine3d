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
    ["011 98888-7777", "+5511988887777"], // com o 0 da operadora
    ["(48) 3333-4444", "+554833334444"], // fixo de outro DDD
  ])("%s → %s", (typed, expected) => {
    expect(toE164(typed)).toBe(expected);
  });

  it.each([
    ["99999-9999"], // sem DDD
    ["(01) 99999-9999"], // DDD inexistente
    ["(11) 89999-9999"], // celular de 9 dígitos que não começa com 9
    ["(20) 99999-9999"], // DDD que não existe
    ["(23) 99999-9999"], // DDD que não existe
    ["(11) 9999-8888"], // celular no formato antigo (sem o 9 na frente)
    ["(11) 1234-5678"], // fixo não começa com 0 ou 1
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

  it("salvar de novo o que foi exibido depois de salvar dá o mesmo resultado", () => {
    const saved = profileSchema.parse(valid);
    // Depois de salvar, o formulário mostra "(11) 99999-9999" e o CRECI como texto.
    const shown = {
      ...valid,
      whatsapp: formatPhone(saved.whatsapp),
      creci: saved.creci ?? "",
      brandColor: saved.brandColor,
    };
    expect(profileSchema.parse(shown)).toEqual(saved);
  });

  it("o servidor recusa null (só recebe o texto digitado, nunca a saída transformada)", () => {
    const result = profileSchema.safeParse({ ...valid, creci: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].code).toBe("invalid_type");
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
