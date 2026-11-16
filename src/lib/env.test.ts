import { afterEach, describe, expect, it, vi } from "vitest";

import { getPublicEnv } from "./env";

const VALID_URL = "https://abcdefgh.supabase.co";
const VALID_KEY = "sb_publishable_teste123";

function setEnv(url: string | undefined, key: string | undefined) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPublicEnv", () => {
  it("aceita URL https e publishable key", () => {
    setEnv(VALID_URL, VALID_KEY);
    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: VALID_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: VALID_KEY,
    });
  });

  it("falha com mensagem clara quando as variáveis faltam", () => {
    setEnv(undefined, undefined);
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("recusa uma secret key no lugar da publishable", () => {
    setEnv(VALID_URL, "sb_secret_nao_pode");
    expect(() => getPublicEnv()).toThrow(/SECRET key/);
  });

  it("recusa URL sem https", () => {
    setEnv("http://abcdefgh.supabase.co", VALID_KEY);
    expect(() => getPublicEnv()).toThrow(/https/);
  });

  it("aceita o Supabase local (localhost) para desenvolvimento", () => {
    setEnv("http://127.0.0.1:54321", VALID_KEY);
    expect(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).toBe(
      "http://127.0.0.1:54321",
    );
  });
});
