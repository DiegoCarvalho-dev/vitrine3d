"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { SelectedUnit } from "@/components/three/BuildingPreview";
import {
  DEMO_FLOORS,
  DEMO_UNITS_PER_FLOOR,
  demoStatusCount,
  STATUS_LABEL,
  UNIT_STATUSES,
} from "@/lib/building";

// O 3D só existe no navegador (WebGL). ssr: false evita tentar renderizá-lo no
// servidor e deixa o pacote do three.js fora do HTML inicial.
const BuildingPreview = dynamic(
  () =>
    import("@/components/three/BuildingPreview").then(
      (mod) => mod.BuildingPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
        Carregando o prédio 3D…
      </div>
    ),
  },
);

export function BuildingLab() {
  const [selected, setSelected] = useState<SelectedUnit | null>(null);
  const count = demoStatusCount(DEMO_FLOORS, DEMO_UNITS_PER_FLOOR);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative h-[60svh] min-h-80 w-full overflow-hidden rounded-lg border bg-muted"
        aria-label={`Prédio 3D de ${DEMO_FLOORS} andares com ${DEMO_UNITS_PER_FLOOR} unidades por andar`}
        data-testid="building-3d"
      >
        <BuildingPreview
          floors={DEMO_FLOORS}
          unitsPerFloor={DEMO_UNITS_PER_FLOOR}
          selected={selected?.number ?? null}
          onSelectUnit={setSelected}
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-7 text-lg"
        data-testid="selected-unit"
      >
        {selected ? (
          <>
            Unidade <strong className="tabular-nums">{selected.number}</strong>
            {": "}
            {STATUS_LABEL[selected.status].toLowerCase()}, {selected.floor}º
            andar
          </>
        ) : (
          <span className="text-muted-foreground">
            Toque ou clique numa unidade para ver o número.
          </span>
        )}
      </p>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground tabular-nums">
        {UNIT_STATUSES.map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 rounded-[2px]"
              style={{ backgroundColor: `var(--status-${status})` }}
            />
            {STATUS_LABEL[status]} ({count[status]})
          </li>
        ))}
      </ul>
    </div>
  );
}
