"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import {
  BuildingIllustration,
  type BuildingUnit,
} from "@/components/building-illustration";
import type { SelectedUnit } from "@/components/three/BuildingPreview";
import { STATUS_LABEL, type UnitStatus } from "@/lib/building";

type TourUnit = BuildingUnit & { numero: string };

/**
 * Prédio do tour (issue #44). O 3D só existe no navegador (WebGL): carregado
 * com ssr: false, fora do HTML inicial. Enquanto carrega, e em aparelhos sem
 * WebGL, aparece o prédio em SVG com os mesmos dados.
 */
export function TourBuilding({
  floors,
  unitsPerFloor,
  units,
}: {
  floors: number;
  unitsPerFloor: number;
  units: TourUnit[];
}) {
  const [selected, setSelected] = useState<SelectedUnit | null>(null);

  const illustration = (
    <BuildingIllustration
      className="mx-auto max-h-[28rem] w-full"
      floors={floors}
      unitsPerFloor={unitsPerFloor}
      units={units}
    />
  );

  const byPosition = useMemo(
    () => new Map(units.map((u) => [`${u.andar}-${u.posicao_no_andar}`, u])),
    [units],
  );
  const getStatus = useCallback(
    (floor: number, position: number): UnitStatus | null =>
      byPosition.get(`${floor}-${position}`)?.status ?? null,
    [byPosition],
  );
  const getNumber = useCallback(
    (floor: number, position: number) =>
      byPosition.get(`${floor}-${position}`)?.numero ??
      `${floor}${String(position).padStart(2, "0")}`,
    [byPosition],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative h-[60svh] max-h-[34rem] min-h-80 w-full overflow-hidden rounded-md"
        aria-label={`Prédio em 3D com ${floors} andares e ${unitsPerFloor} unidades por andar. Toque numa unidade para ver o número e a situação.`}
        data-testid="tour-building-3d"
      >
        {/* SVG underneath while the 3D loads; the 3D canvas covers it. */}
        <div aria-hidden className="absolute inset-0 flex items-center p-4">
          {illustration}
        </div>
        <div className="absolute inset-0">
          <BuildingPreview
            floors={floors}
            unitsPerFloor={unitsPerFloor}
            getStatus={getStatus}
            getNumber={getNumber}
            selected={selected?.number ?? null}
            onSelectUnit={setSelected}
            fallback={illustration}
          />
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-6 text-sm"
        data-testid="tour-selected-unit"
      >
        {selected ? (
          <>
            Unidade <strong className="tabular-nums">{selected.number}</strong>
            {" · "}
            {selected.floor}º andar · {STATUS_LABEL[selected.status]}
          </>
        ) : (
          <span className="text-muted-foreground">
            Toque numa unidade para ver o número e a situação.
          </span>
        )}
      </p>
    </div>
  );
}

const BuildingPreview = dynamic(
  () =>
    import("@/components/three/BuildingPreview").then(
      (mod) => mod.BuildingPreview,
    ),
  { ssr: false }, // while loading, the SVG underneath is what shows
);
