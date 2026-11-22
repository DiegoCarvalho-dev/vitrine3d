"use client";

import { useEffect } from "react";

import { track } from "@/lib/tour/events";

/**
 * Records the visit of a tour page (issue #67): "abriu_tour" (building) or
 * "abriu_unidade" (unit page) when it opens, and "saiu" with the seconds the
 * page was visible each time it goes to the background or closes (on phones
 * `pagehide` is unreliable; `visibilitychange` is the recommended signal).
 */
export function VisitTracker({
  projectId,
  unitId,
}: {
  projectId: string;
  unitId?: string;
}) {
  useEffect(() => {
    const page = unitId ? "unidade" : "predio";
    track(
      unitId
        ? {
            empreendimentoId: projectId,
            unidadeId: unitId,
            tipo: "abriu_unidade",
            dados: { via: "pagina" },
          }
        : { empreendimentoId: projectId, tipo: "abriu_tour" },
    );

    let visibleSince = document.hidden ? null : Date.now();
    const report = () => {
      if (visibleSince === null) return;
      const seconds = Math.round((Date.now() - visibleSince) / 1000);
      visibleSince = null;
      if (seconds < 1) return;
      track(
        {
          empreendimentoId: projectId,
          unidadeId: unitId ?? null,
          tipo: "saiu",
          dados: { pagina: page, segundos: Math.min(seconds, 86_400) },
        },
        { beacon: true },
      );
    };
    const onVisibility = () => {
      if (document.hidden) report();
      else visibleSince = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);
    return () => {
      // Leaving to another page of the site (e.g. building → unit).
      report();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
    };
  }, [projectId, unitId]);
  return null;
}
