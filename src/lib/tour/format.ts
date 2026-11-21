// Text shown to buyers on the public tour (pure functions, unit tested).

import type { UnitStatus } from "@/lib/building";

const longDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC", // dates (YYYY-MM-DD) have no time zone
});
const monthYear = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const parse = (date: string) => new Date(`${date}T00:00:00Z`);

/** Empty delivery date = ready to move in. */
export function deliveryLabel(date: string | null): string {
  return date
    ? `Entrega prevista para ${monthYear.format(parse(date))}`
    : "Pronto para morar";
}

export function checkedAtLabel(date: string | null): string | null {
  return date
    ? `Informações conferidas em ${longDate.format(parse(date))}`
    : null;
}

export function statusCounts(units: readonly { status: UnitStatus }[]) {
  const count: Record<UnitStatus, number> = {
    disponivel: 0,
    reservado: 0,
    vendido: 0,
  };
  for (const unit of units) count[unit.status]++;
  return count;
}

/** Lowest public price ("a partir de"); null when every unit is "sob consulta". */
export function lowestPublicPrice(
  units: readonly { preco_publico: number | null; status: UnitStatus }[],
): number | null {
  const prices = units
    .filter((u) => u.status !== "vendido" && u.preco_publico !== null)
    .map((u) => u.preco_publico as number);
  return prices.length ? Math.min(...prices) : null;
}
