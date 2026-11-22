import "server-only";

import { cache } from "react";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { monthPeriod, parseSummary, type ProjectSummary } from "./summary";

// Visit summary of the broker's panel (issue #72). The counting happens in
// the database (`public.resumo_visitas`, security invoker: the RLS and the
// owner filter apply), so the browser never gets the events themselves.

/** The summary of a period, or null when it could not be loaded. */
async function summaryOf(
  from: Date,
  to: Date,
): Promise<ProjectSummary[] | null> {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resumo_visitas", {
    p_de: from.toISOString(),
    p_ate: to.toISOString(),
  });
  // A failed summary must never break the panel (the project list still
  // shows), but it must not look like "no visits" either: null, and a log.
  if (error) {
    console.error(`Resumo de visitas indisponível (${error.code ?? "erro"})`);
    return null;
  }
  const parsed = parseSummary(data);
  if (parsed === null) console.error("Resumo de visitas em formato inesperado");
  return parsed;
}

/** This month and last month (Brasília time), for the card on the panel. */
export const getMonthSummaries = cache(async () => {
  const now = new Date();
  const current = monthPeriod(now);
  const previous = monthPeriod(now, 1);
  const [thisMonth, lastMonth] = await Promise.all([
    summaryOf(current.from, current.to),
    summaryOf(previous.from, previous.to),
  ]);
  // Last month is only for the comparison: without it the card still works.
  return { thisMonth, lastMonth: lastMonth ?? [], monthStart: current.from };
});
