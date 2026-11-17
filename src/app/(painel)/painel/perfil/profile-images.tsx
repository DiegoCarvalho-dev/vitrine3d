"use client";

import { ImageUpload } from "@/components/image-upload";

import { setProfileImage } from "./actions";

export function ProfileImages({
  avatarUrl,
  logoUrl,
}: {
  avatarUrl: string | null;
  logoUrl: string | null;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ImageUpload
        id="avatar"
        label="Sua foto"
        hint="Aparece ao lado do botão de WhatsApp no tour."
        folder="perfil"
        shape="round"
        imageUrl={avatarUrl}
        save={(path) => setProfileImage("avatar", path)}
        successMessage="Foto salva."
      />
      <ImageUpload
        id="logo"
        label="Logo"
        hint="Sua marca ou a da imobiliária, no topo do tour."
        folder="perfil"
        shape="square"
        imageUrl={logoUrl}
        save={(path) => setProfileImage("logo", path)}
        successMessage="Logo salvo."
      />
    </div>
  );
}
