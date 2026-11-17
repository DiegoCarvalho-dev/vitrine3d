import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "../../(auth)/actions";

export const metadata: Metadata = {
  title: "Painel | Vitrine 3D",
  robots: { index: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second line of defense: even if the proxy is skipped, the panel only
  // renders for a verified user (getClaims checks the JWT; never getSession).
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar");

  const { data: profile } = await supabase
    .from("perfis")
    .select("nome")
    .eq("id", userId)
    .maybeSingle();
  const displayName = profile?.nome || "corretor(a)";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <Link
          href="/painel"
          className="font-heading text-lg font-bold tracking-tight font-stretch-semi-expanded"
        >
          Vitrine 3D
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span
            className="hidden text-muted-foreground sm:inline"
            data-testid="panel-user-name"
          >
            {displayName}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 py-8">{children}</main>
    </div>
  );
}
