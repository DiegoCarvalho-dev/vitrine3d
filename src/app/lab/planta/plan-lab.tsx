"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import {
  FloorPlanPreview,
  type PreviewRoom,
} from "@/components/floor-plan-preview";
import type { ModelPlan, ModelRoom } from "@/components/three/unit-model";
import { Button } from "@/components/ui/button";

const UnitViewer = dynamic(
  () => import("@/components/three/unit-viewer").then((m) => m.UnitViewer),
  { ssr: false },
);

export type LabTypology = {
  name: string;
  rooms: (ModelRoom & PreviewRoom)[];
  plan?: ModelPlan;
};

export function PlanLab({ typologies }: { typologies: LabTypology[] }) {
  const [index, setIndex] = useState(0);
  const [automatic, setAutomatic] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const typology = typologies[index];
  // Automatic doors (#49): the saved ones are left out, the windows stay.
  const plan = useMemo(
    () =>
      automatic && typology.plan
        ? { ...typology.plan, portas: [] }
        : typology.plan,
    [automatic, typology],
  );

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
        <label className="ml-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={automatic}
            onChange={(event) => setAutomatic(event.target.checked)}
          />
          Portas automáticas
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-lg border">
          <UnitViewer
            rooms={typology.rooms}
            plan={plan}
            selectedId={selectedId}
            onSelectRoom={setSelectedId}
          />
        </div>
        <FloorPlanPreview rooms={typology.rooms} />
      </div>
    </div>
  );
}
