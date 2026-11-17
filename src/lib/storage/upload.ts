"use client";

import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, type MediaFolder } from "@/lib/validacoes/midia";

import { compressImage } from "./compress";

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

  const { blob, extension } = await compressImage(file);
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, blob, {
      contentType: blob.type,
      cacheControl: "31536000", // file names never repeat: safe to cache for a year
      upsert: false,
    });
  if (error)
    throw new UploadError("Não foi possível enviar a imagem. Tente de novo.");
  return path;
}

/**
 * Deletes an image of the user (e.g. after replacing it).
 * Returns false when nothing was removed (network error, expired session or
 * someone else's file), so the caller can log it; an orphan never breaks the flow.
 */
export async function removeImage(path: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([path]);
  if (error || !data?.length) {
    console.warn(`[storage] Não foi possível apagar ${path}`);
    return false;
  }
  return true;
}
