import type { Metadata } from "next";

import { getCurrentProfile } from "@/lib/auth/session";
import { DEFAULT_BRAND_COLOR, formatPhone } from "@/lib/validacoes/perfil";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Meu perfil | Vitrine 3D",
  robots: { index: false },
};

export default async function ProfilePage() {
  // Checks the user on the server too (redirects to /entrar when logged out).
  const profile = await getCurrentProfile();

  return (
    <section className="max-w-xl">
      <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
        Meu perfil
      </h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Estes dados aparecem no tour que você manda para os clientes.
      </p>
      <ProfileForm
        defaults={{
          name: profile?.nome ?? "",
          whatsapp: formatPhone(profile?.whatsapp),
          creci: profile?.creci ?? "",
          brandColor: profile?.cor_marca ?? DEFAULT_BRAND_COLOR,
          notifyLeadsByEmail: profile?.notificar_leads_email ?? true,
        }}
      />
    </section>
  );
}
