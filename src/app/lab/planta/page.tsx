import type { Metadata } from "next";

import { PlanLab } from "./plan-lab";

export const metadata: Metadata = {
  title: "Lab: planta 3D",
  robots: { index: false, follow: false }, // página de laboratório, fora do Google
};

export default function PlanLabPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8">
      <h1 className="font-heading text-2xl font-bold font-stretch-semi-expanded">
        Planta 3D
      </h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        As plantas do Residencial Demo (seed) em 3D. Arraste para girar.
      </p>
      <PlanLab />
    </main>
  );
}
