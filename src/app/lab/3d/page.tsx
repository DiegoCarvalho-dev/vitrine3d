import type { Metadata } from "next";

import { BuildingLab } from "./building-lab";

export const metadata: Metadata = {
  title: "Lab: prédio 3D",
  robots: { index: false, follow: false }, // página de laboratório, fora do Google
};

export default function Building3DLabPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8">
      <h1 className="font-heading text-2xl font-bold font-stretch-semi-expanded">
        Prédio 3D
      </h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        Arraste para girar. Use dois dedos ou a roda do mouse para aproximar.
      </p>
      <BuildingLab />
    </main>
  );
}
