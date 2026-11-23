import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { clientIp, ipKey } = await import("./public-writes");

describe("gravação pelo servidor (#84)", () => {
  it("resumo do IP: estável, sem o IP dentro, muda com a chave e o escopo", () => {
    const key = ipKey("200.150.10.1", "sb_secret_a");
    expect(key).toMatch(/^[a-f0-9]{32}$/);
    expect(ipKey("200.150.10.1", "sb_secret_a")).toBe(key);
    expect(key).not.toContain("200");
    expect(ipKey("200.150.10.2", "sb_secret_a")).not.toBe(key);
    expect(ipKey("200.150.10.1", "sb_secret_b")).not.toBe(key);
    expect(ipKey("200.150.10.1", "sb_secret_a", "tour-1")).not.toBe(key);
  });

  it("IP do visitante: só de cabeçalho confiável", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.1.1.1" }))).toBe("1.1.1.1");
    const forwarded = new Headers({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" });
    // Na Vercel o x-forwarded-for é da plataforma: vale.
    expect(clientIp(forwarded, true)).toBe("2.2.2.2");
    // Fora dela o visitante pode inventar: ignorado.
    expect(clientIp(forwarded, false)).toBeNull();
    expect(clientIp(new Headers(), true)).toBeNull();
  });
});
