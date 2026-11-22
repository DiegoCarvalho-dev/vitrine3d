import { describe, expect, it } from "vitest";

import { whatsappLink, whatsappMessage } from "./whatsapp";

describe("botão WhatsApp", () => {
  it("mensagem do prédio e da unidade", () => {
    expect(whatsappMessage("Residencial Casa Nova")).toBe(
      "Olá! Vi o Residencial Casa Nova no tour 3D. Pode me passar mais informações?",
    );
    expect(whatsappMessage("Residencial Casa Nova", "902")).toBe(
      "Olá! Vi o Residencial Casa Nova no tour 3D e me interessei pela unidade 902. Pode me passar mais informações?",
    );
  });

  it("nome com espaços sobrando e muito longo é arrumado", () => {
    expect(whatsappMessage("  Casa   Nova \n ")).toContain("Vi o Casa Nova no");
    expect(whatsappMessage("x".repeat(200))).not.toContain("x".repeat(81));
  });

  it("link wa.me com o número só em dígitos e o texto codificado", () => {
    const link = whatsappLink("+5511999990000", "Olá! Vi o A & B?");
    expect(link).toBe(
      "https://wa.me/5511999990000?text=Ol%C3%A1!%20Vi%20o%20A%20%26%20B%3F",
    );
  });

  it("sem WhatsApp válido, sem link", () => {
    expect(whatsappLink(null, "oi")).toBeNull();
    expect(whatsappLink("", "oi")).toBeNull();
    expect(whatsappLink("11999990000", "oi")).toBeNull(); // sem +
    expect(whatsappLink("+55 11 99999", "oi")).toBeNull();
    expect(whatsappLink("javascript:alert(1)", "oi")).toBeNull();
  });
});
