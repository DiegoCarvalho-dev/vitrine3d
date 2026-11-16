"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ViewIn3DButton({ unit }: { unit: string }) {
  return (
    <Button
      onClick={() =>
        toast(`O tour 3D da unidade ${unit} chega na próxima versão.`)
      }
    >
      Ver em 3D
    </Button>
  );
}
