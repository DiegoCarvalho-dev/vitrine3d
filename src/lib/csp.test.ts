import { describe, expect, it } from "vitest";

import { buildCsp, createNonce, cspHeaderName } from "./csp";

const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((d) => d.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);

describe("CSP (#86)", () => {
  it("scripts só com o nonce do pedido, nada de eval em produção", () => {
    const csp = buildCsp({
      nonce: "abc123",
      supabaseUrl: "https://x.supabase.co",
    });
    expect(directive(csp, "script-src")).toEqual([
      "'self'",
      "'nonce-abc123'",
      "'strict-dynamic'",
    ]);
    expect(csp).not.toContain("unsafe-eval");
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
  });

  it("libera só o Supabase do projeto para imagens e conexões", () => {
    const csp = buildCsp({
      nonce: "n",
      supabaseUrl: "https://x.supabase.co/qualquer/caminho",
    });
    expect(directive(csp, "img-src")).toContain("https://x.supabase.co");
    expect(directive(csp, "connect-src")).toEqual([
      "'self'",
      "https://x.supabase.co",
      "wss://x.supabase.co",
    ]);
    // Endereço inválido ou ausente: só o próprio site.
    expect(directive(buildCsp({ nonce: "n" }), "connect-src")).toEqual([
      "'self'",
    ]);
    expect(
      directive(buildCsp({ nonce: "n", supabaseUrl: "lixo" }), "connect-src"),
    ).toEqual(["'self'"]);
  });

  it("em dev libera eval e o websocket do hot reload", () => {
    const csp = buildCsp({ nonce: "n", dev: true });
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
  });

  it("nonce novo a cada pedido, e o modo só relatar", () => {
    expect(createNonce()).not.toBe(createNonce());
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(cspHeaderName(true)).toBe("Content-Security-Policy-Report-Only");
    expect(cspHeaderName(false)).toBe("Content-Security-Policy");
  });
});
