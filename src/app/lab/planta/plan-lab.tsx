"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { FloorPlanPreview } from "@/components/floor-plan-preview";
import { Button } from "@/components/ui/button";
import { roundArea } from "@/lib/planta/geometry";
import type { RoomType } from "@/lib/validacoes/comodo";
import type { Point } from "@/lib/validacoes/planta";

import seed from "../../../../supabase/seed/residencial-demo.json";

const UnitPreview = dynamic(
  () => import("@/components/three/unit-preview").then((m) => m.UnitPreview),
  { ssr: false },
);

type SeedRoom = {
  nome: string;
  tipo: string;
  geometria: { pontos: number[][]; pe_direito: number };
};

const TYPOLOGIES = (
  seed.tipologias as { nome: string; comodos: SeedRoom[] }[]
).map((t) => ({
  name: t.nome,
  rooms: t.comodos.map((c, i) => ({
    id: `${t.nome}-${i}`,
    name: c.nome,
    type: c.tipo as RoomType,
    points: c.geometria.pontos as Point[],
    height: c.geometria.pe_direito,
    area: roundArea(c.geometria.pontos as Point[]),
  })),
}));

export function PlanLab() {
  const [index, setIndex] = useState(0);
  const typology = TYPOLOGIES[index];
  const rooms = useMemo(() => typology.rooms, [typology]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {TYPOLOGIES.map((t, i) => (
          <Button
            key={t.name}
            size="sm"
            variant={i === index ? "secondary" : "outline"}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            {t.name}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-lg border">
          <UnitPreview rooms={rooms} />
        </div>
        <FloorPlanPreview rooms={rooms} />
      </div>
    </div>
  );
}
