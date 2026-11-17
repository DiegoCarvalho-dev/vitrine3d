import { z } from "zod";

// Paths in the "midias" bucket (same rule as privado.pode_gravar_midia in the DB):
//   {user-id}/{project-id | perfil}/{uuid}.webp|.jpg|.jpeg|.png
// We store PATHS in the database (capa_url, avatar_url, logo_url), never full
// URLs: the public URL is built by publicImageUrl().

export const MEDIA_BUCKET = "midias";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
] as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const STORAGE_PATH = new RegExp(
  `^(${UUID})/(perfil|${UUID})/${UUID}\\.(webp|jpe?g|png)$`,
);

export const storagePathSchema = z
  .string()
  .regex(STORAGE_PATH, "Caminho de imagem inválido.");

/** Folder inside the user's area: "perfil" or a project id. */
export type MediaFolder = "perfil" | (string & {});

/**
 * Is this path valid AND inside the given user's area (and folder, if given)?
 * Used on the server before saving a path sent by the browser.
 */
export function isOwnStoragePath(
  path: string,
  userId: string,
  folder?: MediaFolder,
): boolean {
  const match = STORAGE_PATH.exec(path);
  if (!match) return false;
  return match[1] === userId && (folder === undefined || match[2] === folder);
}

/**
 * Public URL of a stored image (the bucket is public; names are random UUIDs).
 * Returns null for anything that isn't a valid bucket path (e.g. a legacy
 * full URL), so a bad value never becomes a link to another endpoint.
 * (Same format as supabase.storage.from(bucket).getPublicUrl(path).)
 */
export function publicImageUrl(
  supabaseUrl: string,
  path: string | null | undefined,
): string | null {
  if (!path || !STORAGE_PATH.test(path)) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/**
 * Validates an image path sent by the browser before saving it in the
 * database: null (remove) or a bucket path inside the user's own folder
 * (`folder` = "perfil" or the project id). Anything else is refused, so a
 * forged request can't point a column at someone else's file.
 */
export function parseOwnImagePath(
  raw: unknown,
  userId: string,
  folder: MediaFolder,
): { ok: true; path: string | null } | { ok: false } {
  if (raw === null) return { ok: true, path: null };
  const parsed = storagePathSchema.safeParse(raw);
  if (!parsed.success || !isOwnStoragePath(parsed.data, userId, folder)) {
    return { ok: false };
  }
  return { ok: true, path: parsed.data };
}
