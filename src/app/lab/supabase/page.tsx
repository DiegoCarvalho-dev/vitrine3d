import type { Metadata } from "next";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Lab: Supabase",
  robots: { index: false, follow: false }, // página de laboratório, fora do Google
};

type ConnectionResult =
  { ok: true; message: string } | { ok: false; reason: string; hint: string };

async function checkConnection(): Promise<ConnectionResult> {
  // Lê o banco a cada visita (nunca gera a página pronta no build).
  await connection();

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
      hint: "Copie o .env.example para .env.local, preencha com os dados do projeto no Supabase e reinicie o npm run dev.",
    };
  }

  const { data, error } = await supabase
    .from("saude")
    .select("mensagem")
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      reason: `${error.code ?? "erro"}: ${error.message}`,
      hint: "Confira se a migration foi aplicada (supabase db push --remote) e se a chave é a publishable do projeto certo.",
    };
  }
  if (!data) {
    return {
      ok: false,
      reason: "A tabela saude está vazia ou o RLS bloqueou a leitura.",
      hint: "Confira a policy de leitura e a linha inserida na migration.",
    };
  }
  return { ok: true, message: data.mensagem };
}

export default async function SupabaseLabPage() {
  const result = await checkConnection();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-8">
      <h1 className="font-heading text-2xl font-bold font-stretch-semi-expanded">
        Conexão com o Supabase
      </h1>

      {result.ok ? (
        <p
          role="status"
          className="mt-6 flex items-center gap-3 rounded-md border border-status-disponivel/40 bg-status-disponivel/10 px-4 py-3 text-lg"
        >
          <span aria-hidden>✅</span>
          <span>
            Banco respondeu: <strong>{result.message}</strong>
          </span>
        </p>
      ) : (
        <div
          role="alert"
          className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3"
        >
          <p className="font-medium">❌ Não foi possível ler o banco.</p>
          <pre className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
            {result.reason}
          </pre>
          <p className="mt-3 text-sm">{result.hint}</p>
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Página de laboratório: lê a tabela <code>saude</code> no servidor,
        usando a chave pública e o RLS do banco.
      </p>
    </main>
  );
}
