"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  BuildingIllustration,
  type BuildingUnit,
} from "@/components/building-illustration";
import { NativeSelect } from "@/components/native-select";
import type { SelectedUnit } from "@/components/three/BuildingPreview";
import { STATUS_LABEL, type UnitStatus } from "@/lib/building";
import {
  filtersToSearch,
  matchesFilters,
  type TourFilters as Filters,
} from "@/lib/tour/filters";

import { TourFilters } from "./tour-filters";

export type TourUnit = BuildingUnit & {
  numero: string;
  /** Bedrooms of the typology (null = none). */
  quartos: number | null;
  /** Public price (null = "sob consulta"). */
  preco: number | null;
};

const BuildingPreview = dynamic(
  () =>
    import("@/components/three/BuildingPreview").then(
      (mod) => mod.BuildingPreview,
    ),
  { ssr: false }, // while loading, the SVG underneath is what shows
);

/** Does this browser give us a WebGL context? (checked once, in the browser) */
let webglSupport: boolean | undefined;
function hasWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      );
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noop = () => () => {};

/** If the 3D still crashes (e.g. the GPU process dies), show the SVG. */
class Fallback3D extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Prédio do tour (issue #44). O 3D só existe no navegador (WebGL): carregado
 * com ssr: false, fora do HTML inicial. Enquanto carrega, sem WebGL ou se o 3D
 * falhar, aparece o prédio em SVG com os mesmos dados. A lista "Escolher
 * unidade" faz o mesmo que tocar no 3D, para teclado e leitor de tela.
 */
export function TourBuilding({
  floors,
  unitsPerFloor,
  units,
  accentColor,
  initialFilters,
}: {
  floors: number;
  unitsPerFloor: number;
  units: TourUnit[];
  /** The broker's brand color (entrance canopy). */
  accentColor?: string;
  /** Filters from the link (?quartos=3&ate=500000). */
  initialFilters: Filters;
}) {
  const [selected, setSelected] = useState<SelectedUnit | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);

  function changeFilters(next: Filters) {
    setFilters(next);
    // Keeps the link shareable without reloading the page.
    const search = filtersToSearch(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }

  const bedroomOptions = useMemo(
    () =>
      [
        ...new Set(
          units.map((u) => u.quartos).filter((n): n is number => n !== null),
        ),
      ].sort((a, b) => a - b),
    [units],
  );

  // null on the server (no document); true/false in the browser.
  const webgl = useSyncExternalStore(noop, hasWebGL, () => null);

  const byPosition = useMemo(
    () => new Map(units.map((u) => [`${u.andar}-${u.posicao_no_andar}`, u])),
    [units],
  );
  const isDimmed = useCallback(
    (floor: number, position: number) => {
      const unit = byPosition.get(`${floor}-${position}`);
      return unit ? !matchesFilters(unit, filters) : false;
    },
    [byPosition, filters],
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

  const illustration = (
    <BuildingIllustration
      className="mx-auto max-h-[28rem] w-full"
      floors={floors}
      unitsPerFloor={unitsPerFloor}
      units={units}
      isDimmed={isDimmed}
    />
  );

  function selectByNumber(numero: string) {
    const unit = units.find((u) => u.numero === numero);
    setSelected(
      unit
        ? {
            floor: unit.andar,
            position: unit.posicao_no_andar,
            number: unit.numero,
            status: unit.status,
          }
        : null,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <TourFilters
        filters={filters}
        onChange={changeFilters}
        units={units}
        bedroomOptions={bedroomOptions}
        maxFloor={floors}
      />
      <div
        role="region"
        aria-label={`Prédio com ${floors} andares e ${unitsPerFloor} unidades por andar. Toque numa unidade ou use a lista "Escolher unidade" para ver o número e a situação.`}
        className="relative h-[60svh] max-h-[34rem] min-h-80 w-full overflow-hidden rounded-md"
        data-testid="tour-building-3d"
      >
        <span className="absolute top-3 left-3 z-10 rounded-full bg-background/90 px-2 py-0.5 text-xs text-muted-foreground">
          Imagem ilustrativa
        </span>
        {/* SVG underneath while the 3D loads; the 3D canvas covers it. */}
        <div aria-hidden className="absolute inset-0 flex items-center p-4">
          {illustration}
        </div>
        {webgl && (
          <div className="absolute inset-0">
            <Fallback3D
              fallback={
                <div className="flex size-full items-center bg-card p-4">
                  {illustration}
                </div>
              }
            >
              <BuildingPreview
                floors={floors}
                unitsPerFloor={unitsPerFloor}
                getStatus={getStatus}
                getNumber={getNumber}
                selected={selected?.number ?? null}
                onSelectUnit={setSelected}
                accentColor={accentColor}
                isDimmed={isDimmed}
              />
            </Fallback3D>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tour-unit" className="text-sm font-medium">
          Escolher unidade
        </label>
        <NativeSelect
          id="tour-unit"
          className="w-36"
          value={selected?.number ?? ""}
          onChange={(event) => selectByNumber(event.target.value)}
        >
          <option value="">—</option>
          {units.map((u) => (
            <option key={u.numero} value={u.numero}>
              {u.numero}
            </option>
          ))}
        </NativeSelect>
        <p
          role="status"
          aria-live="polite"
          className="min-h-6 text-sm"
          data-testid="tour-selected-unit"
        >
          {selected ? (
            <>
              Unidade{" "}
              <strong className="tabular-nums">{selected.number}</strong>
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
    </div>
  );
}
