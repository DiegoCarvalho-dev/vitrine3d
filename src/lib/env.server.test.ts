import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getEmailEnv } = await import("./env.server");

describe("chaves do e-mail (só no servidor)", () => {
  it("sem as duas chaves: e-mail desligado, sem erro", () => {
    expect(getEmailEnv({})).toBeNull();
    expect(getEmailEnv({ RESEND_API_KEY: "re_x" })).toBeNull();
    expect(getEmailEnv({ SUPABASE_SECRET_KEY: "sb_secret_x" })).toBeNull();
  });

  it("com as duas: ligado, com o remetente padrão do Resend", () => {
    expect(
      getEmailEnv({
        SUPABASE_SECRET_KEY: "sb_secret_x",
        RESEND_API_KEY: "re_y",
      }),
    ).toEqual({
      secretKey: "sb_secret_x",
      resendKey: "re_y",
      from: "Vitrine 3D <onboarding@resend.dev>",
    });
  });

  it("chave trocada (publishable no lugar da secret): desligado, avisa sem mostrar o valor", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      getEmailEnv({
        SUPABASE_SECRET_KEY: "sb_publishable_abc",
        RESEND_API_KEY: "re_y",
      }),
    ).toBeNull();
    expect(log.mock.calls[0]?.[0]).toContain("sb_secret_");
    expect(log.mock.calls[0]?.[0]).not.toContain("abc");
    log.mockRestore();
  });
});
