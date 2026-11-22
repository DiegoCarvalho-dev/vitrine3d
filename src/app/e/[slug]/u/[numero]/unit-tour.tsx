"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useState } from "react";

import type { ModelPlan } from "@/components/three/unit-model";
import type { ViewerRoom, ViewMode } from "@/components/three/unit-viewer";
import { FloorPlanPreview } from "@/components/floor-plan-preview";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/tour/events";
import { useWebGL } from "@/lib/webgl";
import { formatDecimal } from "@/lib/validacoes/numero";

export type UnitRoom = ViewerRoom & { description: string | null };

// The 3D only exists in the browser (WebGL).
const UnitViewer = dynamic(
  () => import("@/components/three/unit-viewer").then((m) => m.UnitViewer),
  {
    ssr: false,
    loading: () => (
      <p className="p-4 text-sm text-muted-foreground">Carregando o 3D…</p>
    ),
  },
);

/**
 * The unit seen from above, with a label per room (issue #50); tapping a
 * label shows the room's description under the 3D. "Caminhar por dentro"
 * walks inside at eye height (issue #51).
 */
export function UnitTour({
  projectId,
  unitId,
  whatsapp,
  rooms,
  plan,
  privateArea,
}: {
  /** For the visit events (issue #67). */
  projectId: string;
  unitId: string;
  /** The WhatsApp button (hidden while walking: it would cover the controls). */
  whatsapp: ReactNode;
  rooms: UnitRoom[];
  plan?: ModelPlan;
  privateArea: number | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("top");
  const webgl = useWebGL(); // null on the server, then true/false
  const selected = rooms.find((room) => room.id === selectedId) ?? null;

  /** Opens (or closes) a room's description; opening is a visit event. */
  function toggleRoom(id: string, via: "etiqueta" | "lista") {
    const opening = selectedId !== id;
    setSelectedId(opening ? id : null);
    if (opening)
      track({
        empreendimentoId: projectId,
        unidadeId: unitId,
        comodoId: id,
        tipo: "viu_comodo",
        dados: { via },
      });
  }

  function startWalking() {
    setMode("walk");
    track({ empreendimentoId: projectId, unidadeId: unitId, tipo: "caminhou" });
  }

  return (
    <section
      aria-label={
        webgl === false ? "Planta da unidade" : "Planta da unidade em 3D"
      }
      className="flex flex-col gap-3"
    >
      {webgl === false ? (
        <div className="flex flex-col gap-3" data-testid="unit-no-webgl">
          <p className="rounded-lg border bg-card p-4 text-sm">
            Este aparelho não conseguiu abrir o 3D. Veja abaixo a planta da
            unidade; no computador ou em outro celular, o passeio em 3D funciona
            normalmente.
          </p>
          <FloorPlanPreview
            rooms={rooms.map((room) => ({ ...room, points: [...room.points] }))}
            highlightId={selectedId}
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {mode === "top" ? (
              <Button onClick={startWalking}>Caminhar por dentro</Button>
            ) : (
              <Button variant="outline" onClick={() => setMode("top")}>
                Voltar à vista de cima
              </Button>
            )}
          </div>
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-lg border sm:aspect-[16/10]"
            data-testid="unit-3d"
          >
            <UnitViewer
              rooms={rooms}
              plan={plan}
              selectedId={selectedId}
              onSelectRoom={(id) => toggleRoom(id, "etiqueta")}
              mode={mode}
            />
            <span className="pointer-events-none absolute top-3 left-3 z-30 rounded-full bg-white/85 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
              Imagem ilustrativa
            </span>
          </div>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        {webgl !== false &&
          "Arraste para girar e use dois dedos (ou a roda do mouse) para aproximar. "}
        Toque no nome de um cômodo para ver a descrição.
        {privateArea ? (
          <>
            {" "}
            Área privativa:{" "}
            <strong className="text-foreground tabular-nums">
              {formatDecimal(privateArea)} m²
            </strong>
            .
          </>
        ) : null}
      </p>
      {/* The same rooms as a list: a label hidden for lack of room on a small
          screen is still one tap away. */}
      <ul aria-label="Cômodos" className="flex flex-wrap gap-2">
        {rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              aria-pressed={room.id === selectedId}
              onClick={() => toggleRoom(room.id, "lista")}
              className={`rounded-full border px-3 py-1 text-sm ${
                room.id === selectedId
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-muted"
              }`}
            >
              {room.name}
            </button>
          </li>
        ))}
      </ul>
      {/* Announced to screen readers when it changes. */}
      <div aria-live="polite">
        {selected && (
          <div
            className="rounded-lg border bg-card p-4"
            data-testid="room-details"
          >
            <p className="font-heading font-semibold">
              {selected.name}{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                · {formatDecimal(selected.area)} m²
              </span>
            </p>
            <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
              {selected.description || "Sem descrição para este cômodo."}
            </p>
          </div>
        )}
      </div>
      {mode !== "walk" && whatsapp}
    </section>
  );
}
