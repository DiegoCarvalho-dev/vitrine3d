import { getCurrentProfile } from "@/lib/auth/session";

export default async function PanelPage({
  searchParams,
}: PageProps<"/painel">) {
  // Same cached call as the layout: one check, one query per request.
  const profile = await getCurrentProfile();
  const firstName = profile?.nome?.trim().split(/\s+/)[0];
  const { erro } = await searchParams;

  return (
    <section className="max-w-xl">
      {erro === "sair" && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
        >
          Não foi possível sair agora. Tente de novo; se continuar, feche o
          navegador.
        </p>
      )}
      <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
        {firstName ? `Olá, ${firstName}` : "Olá"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        Este é o seu painel. Em breve você vai cadastrar seus empreendimentos
        aqui, com as unidades, as plantas e o tour 3D.
      </p>
    </section>
  );
}
