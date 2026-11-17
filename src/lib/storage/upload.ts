"use client";

import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, type MediaFolder } from "@/lib/validacoes/midia";

import { compressToWebp } from "./compress";

export class UploadError extends Error {}

/**
 * Compresses and uploads an image to the user's area of the "midias" bucket.
 * The path is built from the SESSION (user id) plus a random file name; the
 * database policy (privado.pode_gravar_midia) checks it again. Returns the
 * stored path, which is what gets saved in the database.
 */
export async function uploadImage(
  file: File,
  folder: MediaFolder,
): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new UploadError("Sua sessão expirou. Entre de novo.");

  const webp = await compressToWebp(file);
  const path = `${userId}/${folder}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, webp, {
      contentType: "image/webp",
      cacheControl: "31536000", // file names never repeat: safe to cache for a year
      upsert: false,
    });
  if (error)
    throw new UploadError("Não foi possível enviar a imagem. Tente de novo.");
  return path;
}

/** Deletes an image of the user (e.g. after replacing it). Errors are ignored. */
export async function removeImage(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}
