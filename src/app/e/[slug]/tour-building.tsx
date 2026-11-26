"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  BuildingIllustration,
  type BuildingUnit,
} from "@/components/building-illustration";
import { NativeSelect } from "@/components/native-select";
import type { SelectedUnit } from "@/components/three/BuildingPreview";
import { Button, buttonVariants } from "@/components/ui/button";
import { STATUS_LABEL, type UnitStatus } from "@/lib/building";
import { useMediaQuery } from "@/lib/fullscreen";
import { track } from "@/lib/tour/events";
import { WhatsAppButton } from "./whatsapp-button";
import { useWebGL } from "@/lib/webgl";
import {
  filtersToSearch,
  matchesFilters,
  normalizeFilters,
  type TourFilters as Filters,
} from "@/lib/tour/filters";
import {
  priceLabel,
  type SheetTypology,
  typologyRows,
} from "@/lib/tour/unit-sheet";

import { TourFilters } from "./tour-filters";

export type TourUnit = BuildingUnit & {
  id: string;
  numero: string;
  tipologiaId: string | null;
  /** Bedrooms of the typology (null = none). */
  quartos: number | null;
  /** Public price (null = "sob consulta"). */
  preco: number | null;
};

export type TourTypology = SheetTypology & { id: string };

const BuildingPreview = dynamic(
  () =>
    import("@/components/three/BuildingPreview").then(
      (mod) => mod.BuildingPreview,
    ),
  { ssr: false }, // while loading, the SVG underneath is what shows
);

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

/** Keeps the link shareable (filters + open unit) without reloading. */
function syncUrl(filters: Filters, unit: SelectedUnit | null) {
  const search = new URLSearchParams(filtersToSearch(filters));
  if (unit) search.set("unidade", unit.number);
  const query = search.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}`,
  );
}

const toSelected = (unit: TourUnit): SelectedUnit => ({
  floor: unit.andar,
  position: unit.posicao_no_andar,
  number: unit.numero,
  status: unit.status,
});

/**
 * Prédio do tour (issues #44 a #46). O 3D só existe no navegador (WebGL):
 * carregado com ssr: false. Enquanto carrega, sem WebGL ou se o 3D falhar,
 * aparece o prédio em SVG com os mesmos dados. Os filtros e a unidade aberta
 * ficam na URL (?quartos=3&unidade=902). Escolher uma unidade não corta o
 * prédio (#110): a câmera vai até ela, que fica destacada; o corte por andar
 * é só pelo filtro "Ver andar".
 */
export function TourBuilding({
  projectId,
  projectName,
  whatsapp,
  floors,
  unitsPerFloor,
  units,
  typologies,
  accentColor,
  initialFilters,
  initialUnit,
}: {
  /** For the visit events (issue #67) and the WhatsApp message (#68). */
  projectId: string;
  projectName: string;
  /** The broker's WhatsApp (E.164), or null. */
  whatsapp: string | null;
  floors: number;
  unitsPerFloor: number;
  units: TourUnit[];
  typologies: TourTypology[];
  /** The broker's brand color (entrance canopy). */
  accentColor?: string;
  /** Filters from the link (?quartos=3&ate=500000). */
  initialFilters: Filters;
  /** Unit from the link (?unidade=902). */
  initialUnit: string | null;
}) {
  const byNumber = useMemo(
    () => new Map(units.map((u) => [u.numero, u])),
    [units],
  );
  const linkedUnit = initialUnit ? byNumber.get(initialUnit) : undefined;
  const [selected, setSelected] = useState<SelectedUnit | null>(
    linkedUnit ? toSelected(linkedUnit) : null,
  );
  // The floor cut comes only from "Ver andar" (a unit no longer cuts, #110).
  const [cutFloor, setCutFloor] = useState<number | null>(null);
  const bedroomOptions = useMemo(
    () =>
      [
        ...new Set(
          units.map((u) => u.quartos).filter((n): n is number => n !== null),
        ),
      ].sort((a, b) => a - b),
    [units],
  );
  // A link edited by hand may carry values with no matching option.
  const [filters, setFilters] = useState<Filters>(() =>
    normalizeFilters(initialFilters, { bedroomOptions, maxFloor: floors }),
  );

  function changeFilters(next: Filters) {
    setFilters(next);
    syncUrl(next, selected);
  }

  /**
   * Opening a unit (3D tap or list). The building stays whole (#110); only
   * when a floor is already cut, the cut follows the unit to its floor.
   */
  function selectUnit(unit: SelectedUnit | null) {
    setSelected(unit);
    if (unit) {
      if (cutFloor !== null && cutFloor !== unit.floor) setCutFloor(unit.floor);
      const id = byNumber.get(unit.number)?.id;
      if (id)
        track({
          empreendimentoId: projectId,
          unidadeId: id,
          tipo: "abriu_unidade",
          dados: { via: "ficha" },
        });
    }
    syncUrl(filters, unit);
  }

  function changeFloor(floor: number | null) {
    setCutFloor(floor);
    // The open unit is on another floor: close its sheet.
    if (selected && floor !== null && selected.floor !== floor) {
      setSelected(null);
      syncUrl(filters, null);
    }
  }

  // An unknown ?unidade= (e.g. 9999) leaves the link right away.
  useEffect(() => {
    if (initialUnit && !linkedUnit) syncUrl(initialFilters, null);
  }, [initialUnit, linkedUnit, initialFilters]);

  // A link that opens a unit's sheet (?unidade=902) is a visit to it too.
  useEffect(() => {
    if (linkedUnit)
      track({
        empreendimentoId: projectId,
        unidadeId: linkedUnit.id,
        tipo: "abriu_unidade",
        dados: { via: "ficha" },
      });
  }, [linkedUnit, projectId]);

  // After "Fechar" / "Ver o prédio inteiro", focus goes to a stable control.
  const unitSelectRef = useRef<HTMLSelectElement>(null);
  const floorSelectRef = useRef<HTMLSelectElement>(null);

  // null on the server (no document); true/false in the browser.
  const webgl = useWebGL();
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // "Ver por dentro" (#110): the camera flies into the unit, then its page.
  const [entering, setEntering] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  // The heavy 3D code (~250 KB) only starts after the page has fully loaded
  // (cover included) and the browser is idle: on 4G it used to share the
  // connection with the cover and delay it (issue #87). The SVG shows first.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let cancel = () => {};
    const start = () => setIdle(true);
    const whenIdle = () => {
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(start, { timeout: 1_500 });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(start, 300);
        cancel = () => clearTimeout(id);
      }
    };
    if (document.readyState === "complete") {
      whenIdle();
    } else {
      window.addEventListener("load", whenIdle, { once: true });
      cancel = () => window.removeEventListener("load", whenIdle);
    }
    return () => cancel();
  }, []);

  const byPosition = useMemo(
    () => new Map(units.map((u) => [`${u.andar}-${u.posicao_no_andar}`, u])),
    [units],
  );
  const isDimmed = useCallback(
    (floor: number, position: number) => {
      // In the drawing (no cut there), floors above the cut fade out too.
      if (cutFloor !== null && floor > cutFloor) return true;
      const unit = byPosition.get(`${floor}-${position}`);
      return unit ? !matchesFilters(unit, filters) : false;
    },
    [byPosition, filters, cutFloor],
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

  const selectedUnit = selected ? byNumber.get(selected.number) : undefined;
  const typology = selectedUnit?.tipologiaId
    ? (typologies.find((t) => t.id === selectedUnit.tipologiaId) ?? null)
    : null;
  const floorOptions = Array.from({ length: floors }, (_, i) => floors - i);

  const insideHref = selectedUnit
    ? `${pathname}/u/${encodeURIComponent(selectedUnit.numero)}${
        filtersToSearch(filters) ? `?${filtersToSearch(filters)}` : ""
      }`
    : "";

  return (
    <div className="flex flex-col gap-3">
      <TourFilters
        filters={filters}
        onChange={changeFilters}
        units={units}
        bedroomOptions={bedroomOptions}
        maxFloor={floors}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tour-floor" className="text-sm font-medium">
          Ver andar
        </label>
        <NativeSelect
          id="tour-floor"
          className="h-10 w-44 md:h-8"
          ref={floorSelectRef}
          value={cutFloor ?? ""}
          onChange={(event) =>
            changeFloor(
              event.target.value === "" ? null : Number(event.target.value),
            )
          }
        >
          <option value="">Prédio inteiro</option>
          {floorOptions.map((floor) => (
            <option key={floor} value={floor}>
              {floor}º andar
            </option>
          ))}
        </NativeSelect>
        {cutFloor !== null && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              changeFloor(null);
              floorSelectRef.current?.focus();
            }}
          >
            Ver o prédio inteiro
          </Button>
        )}
      </div>

      <div
        role="region"
        aria-label={`Prédio com ${floors} andares e ${unitsPerFloor} unidades por andar${cutFloor ? `, mostrando o ${cutFloor}º andar visto de cima` : ""}. Toque numa unidade ou use a lista "Escolher unidade" para abrir a ficha.`}
        ref={regionRef}
        className="relative h-[60svh] max-h-[34rem] min-h-80 w-full overflow-hidden rounded-md"
        data-testid="tour-building-3d"
        data-cut-floor={cutFloor ?? ""}
        data-entering={entering ? "true" : undefined}
      >
        <span className="absolute top-3 left-3 z-10 rounded-full bg-background/90 px-2 py-0.5 text-xs text-muted-foreground">
          Imagem ilustrativa
        </span>
        {/* SVG underneath while the 3D loads; the 3D canvas covers it. */}
        <div aria-hidden className="absolute inset-0 flex items-center p-4">
          {illustration}
        </div>
        {webgl && idle && (
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
                onSelectUnit={selectUnit}
                accentColor={accentColor}
                isDimmed={isDimmed}
                cutFloor={cutFloor}
                entering={entering}
              />
            </Fallback3D>
          </div>
        )}
        {entering && (
          // The scene fades into the page color while the camera goes in:
          // no white flash before the unit page.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 animate-in bg-background duration-500 fade-in-0"
            style={{ animationDelay: "500ms", animationFillMode: "both" }}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tour-unit" className="text-sm font-medium">
          Escolher unidade
        </label>
        <NativeSelect
          id="tour-unit"
          ref={unitSelectRef}
          className="h-10 w-36 md:h-8"
          value={selected?.number ?? ""}
          onChange={(event) => {
            const unit = byNumber.get(event.target.value);
            selectUnit(unit ? toSelected(unit) : null);
          }}
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
              Toque numa unidade para abrir a ficha.
            </span>
          )}
        </p>
      </div>

      {selected && selectedUnit && (
        <section
          aria-labelledby="unit-sheet-title"
          className="flex flex-col gap-4 rounded-lg border bg-card p-4"
          data-testid="tour-unit-sheet"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="unit-sheet-title"
                className="font-heading text-xl font-semibold"
              >
                Unidade {selectedUnit.numero}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedUnit.andar}º andar
              </p>
            </div>
            <span className="flex items-center gap-2 text-sm font-medium">
              <span
                aria-hidden
                className="size-3 rounded-sm"
                style={{ background: `var(--status-${selectedUnit.status})` }}
              />
              {STATUS_LABEL[selectedUnit.status]}
            </span>
          </div>

          <p
            className="text-2xl font-semibold tabular-nums"
            data-testid="tour-unit-price"
          >
            {priceLabel(selectedUnit.preco)}
          </p>

          {typology ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
              {typologyRows(typology).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Planta desta unidade ainda não informada.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Inside the unit in 3D (#52), keeping the filters for the way back. */}
            <Link
              href={insideHref}
              className={buttonVariants()}
              onClick={(event) => {
                // With the 3D on screen: fly in first (~1 s), then the page.
                // Without it, or with "reduce motion": straight to the page.
                if (!webgl || !idle || reducedMotion || entering) return;
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                setEntering(true);
                regionRef.current?.scrollIntoView({
                  block: "center",
                  behavior: "smooth",
                });
                setTimeout(() => router.push(insideHref), 1000);
              }}
            >
              Ver por dentro
            </Link>
            <Link
              href={`${pathname}/u/${encodeURIComponent(selectedUnit.numero)}#interesse`}
              className={buttonVariants({ variant: "outline" })}
            >
              Tenho interesse
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                selectUnit(null);
                unitSelectRef.current?.focus();
              }}
            >
              Fechar
            </Button>
          </div>
        </section>
      )}
      {/* With a unit open, the message is about that unit. */}
      <WhatsAppButton
        projectId={projectId}
        projectName={projectName}
        phone={whatsapp}
        unit={
          selectedUnit
            ? { id: selectedUnit.id, number: selectedUnit.numero }
            : null
        }
      />
    </div>
  );
}
