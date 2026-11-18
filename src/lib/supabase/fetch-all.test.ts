import { describe, expect, it } from "vitest";

import { chunks, fetchAll } from "./fetch-all";

describe("fetchAll (passa do limite de 1000 linhas da API)", () => {
  it("lê 2500 linhas em 3 páginas", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => i);
    const calls: [number, number][] = [];
    const { data, error } = await fetchAll((from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: all.slice(from, to + 1), error: null });
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("devolve o erro da página que falhou", async () => {
    const { error } = await fetchAll(() =>
      Promise.resolve({ data: null, error: { message: "falhou" } }),
    );
    expect(error?.message).toBe("falhou");
  });
});

describe("chunks", () => {
  it("divide em lotes", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 2)).toEqual([]);
  });
});
