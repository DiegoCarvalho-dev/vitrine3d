import Link from "next/link";

import {
  compare,
  headline,
  type ProjectSummary,
  totalsOf,
} from "@/lib/analytics/summary";

const monthName = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "America/Sao_Paulo", // the server runs in UTC (Vercel)
});

const number = new Intl.NumberFormat("pt-BR");

/**
 * "Seu tour gerou X contatos e Y visitas em novembro" (issue #72): totals of
 * the month with the comparison to last month, and per project the visits,
 * the most opened units and rooms and how many walked inside.
 */
export function MonthSummary({
  thisMonth,
  lastMonth,
  monthStart,
}: {
  thisMonth: ProjectSummary[];
  lastMonth: ProjectSummary[];
  monthStart: Date;
}) {
  const now = totalsOf(thisMonth);
  const before = totalsOf(lastMonth);
  const name = monthName.format(monthStart);
  const empty = now.visits === 0 && now.leads === 0 && now.whatsappClicks === 0;

  if (empty) {
    return (
      <section
        aria-labelledby="summary-title"
        className="rounded-lg border border-dashed p-5"
        data-testid="month-summary-empty"
      >
        <h2 id="summary-title" className="font-heading text-lg font-semibold">
          Resumo de {name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ainda não houve visitas este mês. Compartilhe o link do seu tour no
          WhatsApp e no Instagram, e aqui aparece quem olhou, quanto tempo e
          quem deixou contato.
        </p>
      </section>
    );
  }

  const stats: [string, number, ReturnType<typeof compare>][] = [
    ["Visitas", now.visits, compare(now.visits, before.visits)],
    ["Contatos", now.leads, compare(now.leads, before.leads)],
    [
      "Cliques no WhatsApp",
      now.whatsappClicks,
      compare(now.whatsappClicks, before.whatsappClicks),
    ],
    ["Caminharam por dentro", now.walked, compare(now.walked, before.walked)],
  ];
  const withVisits = thisMonth.filter(
    (project) => project.visitas > 0 || project.leads > 0,
  );

  return (
    <section
      aria-labelledby="summary-title"
      className="flex flex-col gap-5 rounded-lg border bg-card p-5"
      data-testid="month-summary"
    >
      <div>
        <h2 id="summary-title" className="font-heading text-lg font-semibold">
          Resumo de {name}
        </h2>
        <p
          className="mt-1 text-muted-foreground"
          data-testid="summary-headline"
        >
          {headline(now, name)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([label, value, change]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd
              className="font-heading text-2xl font-bold tabular-nums"
              data-testid={`stat-${label}`}
            >
              {number.format(value)}
            </dd>
            {change.label && (
              <dd className="text-xs text-muted-foreground">{change.label}</dd>
            )}
          </div>
        ))}
      </dl>
      <p className="-mt-3 text-xs text-muted-foreground">
        Visita = uma pessoa (um navegador) que abriu o tour; voltar no mesmo
        navegador conta uma vez só no mês.
      </p>

      {withVisits.length > 0 && (
        <ul
          className="grid gap-3 md:grid-cols-2"
          aria-label="Por empreendimento"
        >
          {withVisits.map((project) => (
            <li
              key={project.empreendimento_id}
              className="flex flex-col gap-2 rounded-md border p-3 text-sm"
              data-testid="summary-project"
            >
              <Link
                href={`/painel/empreendimentos/${project.empreendimento_id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {project.nome}
              </Link>
              <p className="text-muted-foreground tabular-nums">
                {project.visitas} {project.visitas === 1 ? "visita" : "visitas"}
                {" · "}
                {project.leads} {project.leads === 1 ? "contato" : "contatos"}
                {project.caminharam > 0 &&
                  ` · ${project.caminharam} caminharam por dentro`}
              </p>
              {project.unidades.length > 0 && (
                <p>
                  <span className="text-muted-foreground">
                    Unidades mais vistas:{" "}
                  </span>
                  {project.unidades
                    .map((unit) => `${unit.numero} (${unit.vezes})`)
                    .join(", ")}
                </p>
              )}
              {project.comodos.length > 0 && (
                <p>
                  <span className="text-muted-foreground">
                    Cômodos mais vistos:{" "}
                  </span>
                  {project.comodos
                    .map((room) => `${room.nome} (${room.vezes})`)
                    .join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
