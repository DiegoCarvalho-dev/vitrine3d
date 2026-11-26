"use client";

import { Maximize, RotateCw } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useRef, useState } from "react";

import type { ModelPlan } from "@/components/three/unit-model";
import type { ViewerRoom, ViewMode } from "@/components/three/unit-viewer";
import { FloorPlanPreview } from "@/components/floor-plan-preview";
import { Button } from "@/components/ui/button";
import { useFullscreen, useMediaQuery } from "@/lib/fullscreen";
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
 * The unit opens INSIDE, at eye height (#110, walk mode of #51); "Voltar à
 * vista de cima" shows it from above with a label per room (#50), and
 * tapping a label shows the room's description under the 3D.
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
  /** The WhatsApp button (always shown: the joystick is optional now). */
  whatsapp: ReactNode;
  rooms: UnitRoom[];
  plan?: ModelPlan;
  privateArea: number | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("walk");
  // "caminhou" is a real step inside, not just the page opening inside.
  const walked = useRef(false);
  const webgl = useWebGL(); // null on the server, then true/false
  // Full screen (#109): an option for phones, where the 3D is small.
  const frame = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(frame);
  const touch = useMediaQuery("(pointer: coarse)");
  const portrait = useMediaQuery("(orientation: portrait)");
  // "Turn the phone" hint: a few seconds, not a permanent cover.
  const [hintOn, setHintOn] = useState(false);
  useEffect(() => {
    if (!hintOn) return;
    const timer = setTimeout(() => setHintOn(false), 5000);
    return () => clearTimeout(timer);
  }, [hintOn]);
  // Focus goes to "Sair" on entering and back to "Tela cheia" on leaving.
  const exitButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const wasActive = useRef(false);
  const { active } = fullscreen;
  useEffect(() => {
    if (active) exitButton.current?.focus({ preventScroll: true });
    else if (wasActive.current)
      openButton.current?.focus({ preventScroll: true });
    wasActive.current = active;
  }, [active]);
  function enterFullscreen() {
    setHintOn(true);
    void fullscreen.enter();
  }
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
  }

  /** The first real step inside: a visit event, once per page. */
  function walkedInside() {
    if (walked.current) return;
    walked.current = true;
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
            {touch && (
              <Button
                ref={openButton}
                variant="outline"
                onClick={enterFullscreen}
              >
                <Maximize aria-hidden />
                Tela cheia
              </Button>
            )}
          </div>
          {/* This box keeps its place in the page while the 3D covers the
              screen, so the page doesn't jump when full screen ends. */}
          <div className="relative aspect-[4/5] sm:aspect-[16/10]">
            <div
              ref={frame}
              className={
                fullscreen.active
                  ? "fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-background"
                  : "absolute inset-0 overflow-hidden rounded-lg border"
              }
              data-testid="unit-3d"
              data-fullscreen={fullscreen.kind ?? "no"}
              // Covering the screen, it acts as a dialog for assistive tech.
              role={fullscreen.active ? "dialog" : undefined}
              aria-modal={fullscreen.active ? true : undefined}
              aria-label={
                fullscreen.active ? "Unidade em tela cheia" : undefined
              }
            >
              <UnitViewer
                rooms={rooms}
                plan={plan}
                selectedId={selectedId}
                onSelectRoom={(id) => toggleRoom(id, "etiqueta")}
                mode={mode}
                onWalk={walkedInside}
                ownsTouch={fullscreen.active}
              />
              {fullscreen.active ? (
                // Only the essentials: leave, and top view / walk.
                <div className="absolute top-3 left-3 z-40 flex flex-col items-start gap-2">
                  <div className="flex gap-2">
                    <Button
                      ref={exitButton}
                      size="sm"
                      variant="secondary"
                      onClick={fullscreen.exit}
                    >
                      Sair da tela cheia
                    </Button>
                    {mode === "top" ? (
                      <Button size="sm" onClick={startWalking}>
                        Caminhar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMode("top")}
                      >
                        Vista de cima
                      </Button>
                    )}
                  </div>
                  <span className="pointer-events-none rounded-full bg-white/85 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
                    Imagem ilustrativa
                  </span>
                </div>
              ) : (
                <span className="pointer-events-none absolute top-3 left-3 z-30 rounded-full bg-white/85 px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
                  Imagem ilustrativa
                </span>
              )}
              {fullscreen.active && hintOn && portrait && (
                <p
                  role="status"
                  data-testid="rotate-hint"
                  className="pointer-events-none absolute top-1/2 left-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/65 px-4 py-2 text-sm text-white"
                >
                  <RotateCw className="size-4" aria-hidden />
                  Vire o celular para ver melhor
                </p>
              )}
            </div>
          </div>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        {webgl !== false &&
          (mode === "walk"
            ? "Você está dentro da unidade. "
            : "Arraste para girar e use dois dedos (ou a roda do mouse) para aproximar. ")}
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
      {/* Always at hand: the joystick is optional now, nothing to cover. */}
      {whatsapp}
    </section>
  );
}
