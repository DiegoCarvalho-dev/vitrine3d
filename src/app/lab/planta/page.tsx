import type { Metadata } from "next";

import { roundArea } from "@/lib/planta/geometry";
import { roomTypeSchema } from "@/lib/validacoes/comodo";
import { floorPlanSchema, roomGeometrySchema } from "@/lib/validacoes/planta";

import seed from "../../../../supabase/seed/residencial-demo.json";
import { type LabTypology, PlanLab } from "./plan-lab";

export const metadata: Metadata = {
  title: "Lab: planta 3D",
  robots: { index: false, follow: false }, // página de laboratório, fora do Google
};

// Only the typologies go to the browser (validated like the real data).
const typologies: LabTypology[] = seed.tipologias.map((t) => ({
  name: t.nome,
  plan: floorPlanSchema.safeParse(t.planta).data,
  rooms: t.comodos.flatMap((c, i) => {
    const type = roomTypeSchema.safeParse(c.tipo);
    const geometry = roomGeometrySchema.safeParse(c.geometria);
    if (!type.success || !geometry.success) return [];
    return [
      {
        id: `${t.nome}-${i}`,
        name: c.nome,
        type: type.data,
        points: geometry.data.pontos,
        height: geometry.data.pe_direito,
        area: roundArea(geometry.data.pontos),
      },
    ];
  }),
}));

export default function PlanLabPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8">
      <h1 className="font-heading text-2xl font-bold font-stretch-semi-expanded">
        Planta 3D
      </h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        As plantas do Residencial Demo (seed) em 3D. Arraste para girar.
      </p>
      <PlanLab typologies={typologies} />
    </main>
  );
}
