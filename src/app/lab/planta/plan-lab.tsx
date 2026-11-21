"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import {
  FloorPlanPreview,
  type PreviewRoom,
} from "@/components/floor-plan-preview";
import type { ModelRoom } from "@/components/three/unit-model";
import { Button } from "@/components/ui/button";

const UnitPreview = dynamic(
  () => import("@/components/three/unit-preview").then((m) => m.UnitPreview),
  { ssr: false },
);

export type LabTypology = { name: string; rooms: (ModelRoom & PreviewRoom)[] };

export function PlanLab({ typologies }: { typologies: LabTypology[] }) {
  const [index, setIndex] = useState(0);
  const typology = typologies[index];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {typologies.map((t, i) => (
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
          <UnitPreview rooms={typology.rooms} />
        </div>
        <FloorPlanPreview rooms={typology.rooms} />
      </div>
    </div>
  );
}
