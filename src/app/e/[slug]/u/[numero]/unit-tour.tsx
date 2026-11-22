"use client";

import dynamic from "next/dynamic";

import type { ModelPlan, ModelRoom } from "@/components/three/unit-model";

export type UnitRoom = ModelRoom & {
  name: string;
  description: string | null;
  area: number;
};

// The 3D only exists in the browser (WebGL).
const UnitPreview = dynamic(
  () => import("@/components/three/unit-preview").then((m) => m.UnitPreview),
  {
    ssr: false,
    loading: () => (
      <p className="p-4 text-sm text-muted-foreground">Carregando o 3D…</p>
    ),
  },
);

/** The unit in 3D on the public page. */
export function UnitTour({
  rooms,
  plan,
}: {
  rooms: UnitRoom[];
  plan?: ModelPlan;
  privateArea: number | null;
}) {
  return (
    <div
      className="relative aspect-[4/5] overflow-hidden rounded-lg border sm:aspect-[16/10]"
      data-testid="unit-3d"
    >
      <UnitPreview rooms={rooms} plan={plan} />
    </div>
  );
}
