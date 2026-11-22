import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade | Vitrine 3D",
  description:
    "Como os dados de quem visita um tour 3D e deixa seu contato são usados.",
};

// Privacy policy of the public tour (issue #69, LGPD). Plain language: the
// visitor needs to understand who receives the data, why and how to ask for
// it to be deleted.

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 text-[15px] leading-relaxed">
      <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
        Política de privacidade
      </h1>
      <p className="text-muted-foreground">
        Esta página explica, em linguagem simples, o que acontece com os seus
        dados quando você visita um tour 3D da Vitrine 3D e quando deixa seu
        contato com o corretor.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold">Quem recebe</h2>
        <p>
          O tour pertence a um corretor de imóveis (o nome dele aparece no topo
          do tour). Quando você envia o formulário &ldquo;Tenho
          interesse&rdquo;, seus dados vão{" "}
          <strong>só para esse corretor</strong>, para que ele fale com você
          sobre o imóvel. A Vitrine 3D guarda os dados em nome dele e não os
          vende nem os repassa a ninguém.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold">O que é coletado</h2>
        <ul className="list-disc pl-5">
          <li>
            <strong>No formulário:</strong> nome, telefone e/ou e-mail, mensagem
            (se você escrever) e a unidade de interesse, com a data e a hora do
            seu consentimento.
          </li>
          <li>
            <strong>Durante a visita, sem dados pessoais:</strong> as páginas e
            os cômodos vistos e o tempo no tour, ligados a um código aleatório
            guardado no seu navegador. Assim o corretor sabe o que mais
            interessou. Não usamos cookies de rastreio nem anúncios.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold">Para que é usado</h2>
        <p>
          Só para o corretor responder ao seu interesse no imóvel. Seus dados
          não são usados para outros fins sem pedir a você antes.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold">
          Por quanto tempo e como pedir a exclusão
        </h2>
        <p>
          Os dados ficam guardados enquanto o corretor estiver atendendo o seu
          interesse. Você pode pedir a qualquer momento para ver, corrigir ou
          apagar seus dados: fale com o corretor pelo WhatsApp ou e-mail
          mostrados no tour, e ele apaga o seu contato. Esses são os seus
          direitos pela Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        Os valores, a disponibilidade e as imagens do tour são informados pelo
        corretor e podem mudar; confirme sempre com ele.
      </p>
    </main>
  );
}
