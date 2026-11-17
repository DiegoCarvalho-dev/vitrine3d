import { describe, expect, it } from "vitest";

import { fitWithin, isAcceptedImage } from "../storage/compress";
import {
  isOwnStoragePath,
  parseOwnImagePath,
  publicImageUrl,
  storagePathSchema,
} from "./midia";

const USER = "0d3e0000-0000-4000-8000-000000000001";
const OTHER = "0d3e0000-0000-4000-8000-000000000002";
const PROJECT = "0d3e0000-0000-4000-8000-000000000010";
const FILE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("storagePathSchema", () => {
  it.each([
    [`${USER}/perfil/${FILE}.webp`],
    [`${USER}/${PROJECT}/${FILE}.jpg`],
    [`${USER}/${PROJECT}/${FILE}.png`],
  ])("aceita %s", (path) => {
    expect(storagePathSchema.safeParse(path).success).toBe(true);
  });

  it.each([
    [`${USER}/perfil/${FILE}.svg`, "extensão perigosa"],
    [`${USER}/perfil/${FILE}.html`, "extensão perigosa"],
    [`${USER}/perfil/foto.webp`, "nome adivinhável"],
    [`${USER}/perfil/x/${FILE}.webp`, "subpasta"],
    [`${USER}/perfil/../${OTHER}/${FILE}.webp`, "caminho com .."],
    [`https://site-malicioso.com/${FILE}.webp`, "URL externa"],
    [`/${USER}/perfil/${FILE}.webp`, "barra no início"],
  ])("recusa %s (%s)", (path) => {
    expect(storagePathSchema.safeParse(path).success).toBe(false);
  });
});

describe("isOwnStoragePath", () => {
  it("aceita o caminho do próprio usuário", () => {
    expect(isOwnStoragePath(`${USER}/perfil/${FILE}.webp`, USER)).toBe(true);
  });

  it("recusa o caminho de outro usuário", () => {
    expect(isOwnStoragePath(`${OTHER}/perfil/${FILE}.webp`, USER)).toBe(false);
  });

  it("confere a pasta quando informada", () => {
    expect(
      isOwnStoragePath(`${USER}/${PROJECT}/${FILE}.webp`, USER, PROJECT),
    ).toBe(true);
    expect(isOwnStoragePath(`${USER}/perfil/${FILE}.webp`, USER, PROJECT)).toBe(
      false,
    );
  });
});

describe("publicImageUrl", () => {
  it("devolve null para caminho inválido ou URL externa", () => {
    expect(
      publicImageUrl(
        "https://abc.supabase.co",
        "https://site-malicioso.com/x.webp",
      ),
    ).toBeNull();
    expect(publicImageUrl("https://abc.supabase.co", null)).toBeNull();
  });

  it("monta a URL pública do bucket", () => {
    expect(
      publicImageUrl("https://abc.supabase.co/", `${USER}/perfil/${FILE}.webp`),
    ).toBe(
      `https://abc.supabase.co/storage/v1/object/public/midias/${USER}/perfil/${FILE}.webp`,
    );
  });
});

describe("fitWithin (compressão)", () => {
  it("reduz uma foto de celular (4032 × 3024) para 1920 no lado maior", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1920, height: 1440 });
  });

  it("funciona com foto em pé", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1440, height: 1920 });
  });

  it("não aumenta imagens pequenas", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("isAcceptedImage", () => {
  it("aceita JPG, PNG e WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(isAcceptedImage({ type })).toBe(true);
    }
  });

  it("recusa SVG, GIF e PDF", () => {
    for (const type of ["image/svg+xml", "image/gif", "application/pdf"]) {
      expect(isAcceptedImage({ type })).toBe(false);
    }
  });
});

describe("parseOwnImagePath (o que a Server Action aceita salvar)", () => {
  const me = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const project = "33333333-3333-4333-8333-333333333333";
  const otherProject = "44444444-4444-4444-8444-444444444444";
  const file = "55555555-5555-4555-8555-555555555555.webp";

  it("null remove a imagem", () => {
    expect(parseOwnImagePath(null, me, project)).toEqual({
      ok: true,
      path: null,
    });
  });

  it("aceita a capa na pasta do próprio empreendimento", () => {
    expect(parseOwnImagePath(`${me}/${project}/${file}`, me, project)).toEqual({
      ok: true,
      path: `${me}/${project}/${file}`,
    });
  });

  it.each([
    [
      "pasta de outro corretor (requisição forjada)",
      `${other}/${project}/${file}`,
    ],
    ["outro empreendimento meu", `${me}/${otherProject}/${file}`],
    ["pasta do perfil usada como capa", `${me}/perfil/${file}`],
    ["URL externa", "https://site-malicioso.com/x.webp"],
    ["texto vazio", ""],
    ["número", 42],
  ])("recusa %s", (_, raw) => {
    expect(parseOwnImagePath(raw, me, project)).toEqual({ ok: false });
  });

  it("foto e logo só na pasta perfil", () => {
    expect(parseOwnImagePath(`${me}/perfil/${file}`, me, "perfil").ok).toBe(
      true,
    );
    expect(parseOwnImagePath(`${me}/${project}/${file}`, me, "perfil").ok).toBe(
      false,
    );
  });
});
