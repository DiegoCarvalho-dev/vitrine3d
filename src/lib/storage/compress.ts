import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validacoes/midia";

// Browser-side image compression: phone photos (3-8 MB) become files of a few
// hundred KB before upload. Keeps the free Storage small and the tour fast on 4G.
// WebP when the browser can encode it; JPEG otherwise (Safari before 17).

export const MAX_DIMENSION = 1920;
/** Bigger originals are refused before decoding (decoding can crash a phone tab). */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const QUALITIES = [0.82, 0.7, 0.55];

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

export type CompressedImage = { blob: Blob; extension: "webp" | "jpg" };

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

/**
 * Converts an image to WebP (or JPEG where WebP encoding isn't supported),
 * longer side up to 1920 px, lowering the quality until it fits in 2 MB.
 * Throws ImageCompressionError with a message for the user.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!isAcceptedImage(file)) {
    throw new ImageCompressionError("Envie uma imagem JPG, PNG ou WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageCompressionError(
      "Imagem muito grande (máx. 25 MB). Tente outra foto.",
    );
  }

  let bitmap: ImageBitmap;
  try {
    // Respect the camera's EXIF rotation (the output drops EXIF).
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageCompressionError("Não foi possível ler essa imagem.");
  }

  const canvas = document.createElement("canvas");
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImageCompressionError(
        "Seu navegador não conseguiu processar a imagem.",
      );
    }
    context.drawImage(bitmap, 0, 0, width, height);
  } finally {
    bitmap.close(); // free the decoded pixels even on error
  }

  // Probe WebP once: browsers that can't encode it return a PNG instead.
  const probe = await encode(canvas, "image/webp", QUALITIES[0]);
  const format =
    probe?.type === "image/webp"
      ? ({ type: "image/webp", extension: "webp" } as const)
      : ({ type: "image/jpeg", extension: "jpg" } as const);

  for (const [index, quality] of QUALITIES.entries()) {
    const blob =
      index === 0 && format.type === "image/webp"
        ? probe
        : await encode(canvas, format.type, quality);
    if (blob && blob.type === format.type && blob.size <= MAX_IMAGE_BYTES) {
      return { blob, extension: format.extension };
    }
  }
  throw new ImageCompressionError(
    "A imagem continua grande demais. Tente outra foto.",
  );
}
