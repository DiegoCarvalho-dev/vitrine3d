import "server-only";

import { createClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET } from "@/lib/validacoes/midia";

/**
 * Deletes an image the user replaced or removed (best effort: an orphan
 * file never breaks the save). The Storage policy only lets the owner
 * delete files in their own folder.
 */
export async function deleteStoredImage(path: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([path]);
  if (error || !data?.length) {
    console.warn(`[storage] Não consegui apagar ${path}`);
  }
}
