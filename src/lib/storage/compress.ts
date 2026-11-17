import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validacoes/midia";

// Browser-side image compression: phone photos (3-8 MB) become WebP files of a
// few hundred KB before upload. Keeps the free Storage small and the tour fast on 4G.

export const MAX_DIMENSION = 1920;

/** Scales (width, height) so the longer side is at most `max`; never upscales. */
export function fitWithin(width: number, height: number, max = MAX_DIMENSION) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export class ImageCompressionError extends Error {}

/** Is this file type accepted for upload (before compressing)? */
export function isAcceptedImage(file: Pick<File, "type">): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

/**
 * Converts an image file to WebP, longer side up to 1920 px. Lowers the quality
 * until it fits in 2 MB. Throws ImageCompressionError with a message for the user.
 */
export async function compressToWebp(file: File): Promise<Blob> {
  if (!isAcceptedImage(file)) {
    throw new ImageCompressionError("Envie uma imagem JPG, PNG ou WebP.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageCompressionError("Não foi possível ler essa imagem.");
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context)
    throw new ImageCompressionError(
      "Seu navegador não conseguiu processar a imagem.",
    );
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.82, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.type === "image/webp" && blob.size <= MAX_IMAGE_BYTES)
      return blob;
  }
  throw new ImageCompressionError(
    "A imagem continua grande demais. Tente outra foto.",
  );
}
