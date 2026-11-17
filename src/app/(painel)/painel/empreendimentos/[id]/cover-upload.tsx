"use client";

import { ImageUpload } from "@/components/image-upload";

import { setProjectCover } from "./actions";

export function CoverUpload({
  projectId,
  imageUrl,
}: {
  projectId: string;
  imageUrl: string | null;
}) {
  return (
    <ImageUpload
      id="cover"
      label="Foto de capa"
      hint="Aparece no topo do tour e na prévia do link no WhatsApp. Foto na horizontal fica melhor."
      folder={projectId}
      imageUrl={imageUrl}
      save={(path) => setProjectCover(projectId, path)}
      successMessage="Capa salva."
    />
  );
}
