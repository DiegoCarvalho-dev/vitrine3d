import { createClient } from "@/lib/supabase/server";

export default async function PanelPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const { data: profile } = await supabase
    .from("perfis")
    .select("nome")
    .eq("id", data?.claims?.sub ?? "")
    .maybeSingle();
  const firstName = profile?.nome?.split(" ")[0];

  return (
    <section className="max-w-xl">
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
