"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { ModelPlan } from "@/components/three/unit-model";
import type { ViewerRoom } from "@/components/three/unit-viewer";
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
 * The unit seen from above, with a label per room (issue #50). Tapping a
 * label shows the room's description under the 3D.
 */
export function UnitTour({
  rooms,
  plan,
  privateArea,
}: {
  rooms: UnitRoom[];
  plan?: ModelPlan;
  privateArea: number | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rooms.find((room) => room.id === selectedId) ?? null;

  return (
    <section
      aria-label="Planta da unidade em 3D"
      className="flex flex-col gap-3"
    >
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-lg border sm:aspect-[16/10]"
        data-testid="unit-3d"
      >
        <UnitViewer
          rooms={rooms}
          plan={plan}
          selectedId={selectedId}
          onSelectRoom={(id) =>
            setSelectedId((current) => (current === id ? null : id))
          }
        />
        <span className="pointer-events-none absolute top-3 left-3 z-30 rounded-full bg-white/85 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
          Imagem ilustrativa
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Arraste para girar e use dois dedos (ou a roda do mouse) para aproximar.
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
              onClick={() =>
                setSelectedId((current) =>
                  current === room.id ? null : room.id,
                )
              }
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
    </section>
  );
}
