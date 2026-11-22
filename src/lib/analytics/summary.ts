import { z } from "zod";

// Visit summary of the panel (issue #72). The numbers are computed in the
// database (`public.resumo_visitas`); here: the month periods (Brasília time),
// checking the JSON it returns, totals and the comparison with last month.
// Pure functions, unit tested.

/** Brazil has no daylight saving time since 2019: Brasília is always UTC−3. */
const BRASILIA_OFFSET_HOURS = 3;

export type Period = { from: Date; to: Date };

/** [first day of the month 00:00, first day of the next month 00:00) in Brasília. */
export function monthPeriod(now: Date, monthsAgo = 0): Period {
  const local = new Date(now.getTime() - BRASILIA_OFFSET_HOURS * 3_600_000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth() - monthsAgo;
  return {
    from: new Date(Date.UTC(year, month, 1, BRASILIA_OFFSET_HOURS)),
    to: new Date(Date.UTC(year, month + 1, 1, BRASILIA_OFFSET_HOURS)),
  };
}

const projectSummarySchema = z.object({
  empreendimento_id: z.string(),
  nome: z.string(),
  visitas: z.number().int().nonnegative(),
  caminharam: z.number().int().nonnegative(),
  cliques_whatsapp: z.number().int().nonnegative(),
  leads: z.number().int().nonnegative(),
  unidades: z.array(
    z.object({ numero: z.string(), vezes: z.number().int().positive() }),
  ),
  comodos: z.array(
    z.object({ nome: z.string(), vezes: z.number().int().positive() }),
  ),
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;

/** The JSON of `resumo_visitas`; a malformed one means "no data", never a crash. */
export function parseSummary(json: unknown): ProjectSummary[] {
  const parsed = z.array(projectSummarySchema).safeParse(json);
  return parsed.success ? parsed.data : [];
}

export type Totals = {
  visits: number;
  leads: number;
  whatsappClicks: number;
  walked: number;
};

export function totalsOf(projects: readonly ProjectSummary[]): Totals {
  return projects.reduce<Totals>(
    (sum, project) => ({
      visits: sum.visits + project.visitas,
      leads: sum.leads + project.leads,
      whatsappClicks: sum.whatsappClicks + project.cliques_whatsapp,
      walked: sum.walked + project.caminharam,
    }),
    { visits: 0, leads: 0, whatsappClicks: 0, walked: 0 },
  );
}

export type Change = {
  /** Difference from the previous month (can be negative). */
  difference: number;
  /** "+25%" / "−10%" / "igual" / null when there is nothing to compare. */
  label: string | null;
};

/** Current vs previous month: no percentage when last month was zero. */
export function compare(current: number, previous: number): Change {
  const difference = current - previous;
  if (previous === 0) return { difference, label: null };
  if (difference === 0) return { difference, label: "igual ao mês passado" };
  const percent = Math.round((difference / previous) * 100);
  return {
    difference,
    label: `${percent > 0 ? "+" : "−"}${Math.abs(percent)}% sobre o mês passado`,
  };
}

/** "Seu tour gerou 12 contatos e 340 visitas em novembro." */
export function headline(totals: Totals, monthName: string): string {
  const leads = `${totals.leads} ${totals.leads === 1 ? "contato" : "contatos"}`;
  const visits = `${totals.visits} ${totals.visits === 1 ? "visita" : "visitas"}`;
  return `Seu tour gerou ${leads} e ${visits} em ${monthName}.`;
}
