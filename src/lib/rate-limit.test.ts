import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("limite por minuto", () => {
  it("deixa passar até o limite e recusa o resto na mesma janela", () => {
    const allow = createRateLimiter(3, 60_000);
    expect([1, 2, 3, 4].map(() => allow("a", 1_000))).toEqual([
      true,
      true,
      true,
      false,
    ]);
    // Outra chave não é afetada.
    expect(allow("b", 1_000)).toBe(true);
  });

  it("libera de novo quando a janela passa", () => {
    const allow = createRateLimiter(1, 60_000);
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 30_000)).toBe(false);
    expect(allow("a", 60_001)).toBe(true);
  });
});
