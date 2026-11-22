import "server-only";

import { cache } from "react";

import { requireUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { monthPeriod, parseSummary, type ProjectSummary } from "./summary";

// Visit summary of the broker's panel (issue #72). The counting happens in
// the database (`public.resumo_visitas`, security invoker: the RLS and the
// owner filter apply), so the browser never gets the events themselves.

async function summaryOf(from: Date, to: Date): Promise<ProjectSummary[]> {
  await requireUserId();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resumo_visitas", {
    p_de: from.toISOString(),
    p_ate: to.toISOString(),
  });
  // A failed summary must never break the panel: the project list still shows.
  if (error) return [];
  return parseSummary(data);
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
  return { thisMonth, lastMonth, monthStart: current.from };
});
