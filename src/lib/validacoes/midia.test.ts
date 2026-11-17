import { describe, expect, it } from "vitest";

import { fitWithin, isAcceptedImage } from "../storage/compress";
import { isOwnStoragePath, publicImageUrl, storagePathSchema } from "./midia";

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
