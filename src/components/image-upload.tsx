"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { ImageCompressionError } from "@/lib/storage/compress";
import { removeImage, uploadImage, UploadError } from "@/lib/storage/upload";
import type { MediaFolder } from "@/lib/validacoes/midia";

type SaveResult = { ok: true } | { ok?: false; error: string };

/**
 * Pick, preview, compress (WebP/JPEG, up to 1920 px), upload, replace and
 * remove one image. `save` is a Server Action that validates the path and
 * stores it (and deletes the previous file). If saving fails, the file just
 * uploaded is deleted, so no orphan is left behind.
 */
export function ImageUpload({
  id,
  label,
  hint,
  folder,
  imageUrl,
  shape = "wide",
  save,
  successMessage,
}: {
  id: string;
  label: string;
  hint?: string;
  folder: MediaFolder;
  /** Public URL of the current image (null = none). */
  imageUrl: string | null;
  /** wide = cover (16:9); round = person photo (cropped); square = logo (whole). */
  shape?: "wide" | "round" | "square";
  save: (path: string | null) => Promise<SaveResult>;
  successMessage: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Local preview while uploading. It belongs to the image that was on screen
  // when it started: once the server sends the new image, it is ignored.
  const [preview, setPreviewState] = useState<{
    src: string;
    replaces: string | null;
  } | null>(null);
  const setPreview = (src: string | null) =>
    setPreviewState(src ? { src, replaces: imageUrl } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const shown =
    preview && preview.replaces === imageUrl ? preview.src : imageUrl;

  // Free the memory of a local preview when it is replaced.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.src);
  }, [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    let uploaded: string | undefined;
    try {
      uploaded = await uploadImage(file, folder);
    } catch (caught) {
      setPreview(null);
      setError(
        caught instanceof ImageCompressionError || caught instanceof UploadError
          ? caught.message
          : "Não foi possível enviar a imagem. Tente de novo.",
      );
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    try {
      const result = await save(uploaded);
      if (result.ok) {
        toast.success(successMessage);
      } else {
        // The server refused it: the file just uploaded would be an orphan.
        await removeImage(uploaded);
        setError(result.error);
      }
    } catch {
      // The connection dropped mid-save: the server may already have saved
      // it, so the file is NOT deleted here (worst case, an orphan).
      setError(
        "A conexão caiu. Recarregue a página para ver se a imagem foi salva.",
      );
    } finally {
      // Success: the server image (new imageUrl) replaces the local preview,
      // which frees the original photo from memory.
      setPreview(null);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ""; // allow the same file again
    }
  }

  async function onRemove() {
    setError(undefined);
    setBusy(true);
    try {
      const result = await save(null);
      if (!result.ok) setError(result.error);
      else toast.success("Imagem removida.");
    } catch {
      setError(
        "Não foi possível conectar. Verifique a internet e tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid={`${id}-upload`}>
      <span className="text-sm font-medium" id={`${id}-label`}>
        {label}
      </span>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border bg-muted",
          shape === "wide" && "aspect-video w-full max-w-md",
          shape === "round" && "size-28 rounded-full",
          shape === "square" && "size-28",
        )}
      >
        {shown ? (
          // Plain <img>: files are already compressed (WebP, up to 1920 px) and
          // Vercel's image optimizer has a small free quota.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt={label}
            data-testid={`${id}-image`}
            className={cn(
              "size-full",
              shape === "square" ? "object-contain p-1" : "object-cover",
            )}
          />
        ) : (
          <ImageIcon aria-hidden className="size-8 text-muted-foreground" />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-medium">
            Enviando…
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-labelledby={`${id}-label`}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        disabled={busy}
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {imageUrl ? "Trocar" : "Escolher foto"}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onRemove}
          >
            Remover
          </Button>
        )}
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          data-testid={`${id}-error`}
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
