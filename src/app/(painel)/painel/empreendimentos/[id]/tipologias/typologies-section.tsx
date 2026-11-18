"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDecimal } from "@/lib/validacoes/numero";
import type { TypologyInput } from "@/lib/validacoes/tipologia";

import { deleteTypology, duplicateTypology } from "./actions";
import { EMPTY_TYPOLOGY, TypologyFormDialog } from "./typology-form-dialog";

export type TypologyItem = {
  id: string;
  nome: string;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  area_privativa_m2: number | null;
  roomCount: number;
  unitCount: number;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function summary(t: TypologyItem) {
  return [
    plural(t.quartos, "quarto", "quartos"),
    t.suites ? plural(t.suites, "suíte", "suítes") : null,
    plural(t.banheiros, "banheiro", "banheiros"),
    plural(t.vagas, "vaga", "vagas"),
    t.area_privativa_m2 ? `${formatDecimal(t.area_privativa_m2)} m²` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function toInput(t: TypologyItem): TypologyInput {
  return {
    name: t.nome,
    bedrooms: String(t.quartos),
    suites: String(t.suites),
    bathrooms: String(t.banheiros),
    parkingSpots: String(t.vagas),
    privateArea: formatDecimal(t.area_privativa_m2),
  };
}

export function TypologiesSection({
  projectId,
  typologies,
}: {
  projectId: string;
  typologies: TypologyItem[];
}) {
  // Which dialog is open: "new", a typology to edit, or one to delete.
  const [editing, setEditing] = useState<TypologyItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<TypologyItem | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok?: boolean; error?: string }>,
    success: string,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) toast.success(success);
        else toast.error(result.error);
      } catch {
        toast.error(
          "Não foi possível conectar. Verifique a internet e tente de novo.",
        );
      }
    });
  }

  return (
    <section aria-labelledby="typologies-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="typologies-title"
          className="font-heading text-xl font-semibold"
        >
          Tipologias
        </h2>
        <Button variant="outline" onClick={() => setEditing("new")}>
          Nova tipologia
        </Button>
      </div>

      {typologies.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Cadastre as plantas que se repetem no prédio (ex.: Tipo A, 2 quartos).
          Depois é só aplicar cada uma às unidades.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="typology-list">
          {typologies.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid="typology-item"
            >
              <div className="min-w-0">
                <h3 className="font-heading font-semibold">{t.nome}</h3>
                <p className="text-sm text-muted-foreground">{summary(t)}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {plural(t.roomCount, "cômodo", "cômodos")} ·{" "}
                  {plural(t.unitCount, "unidade", "unidades")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/painel/empreendimentos/${projectId}/tipologias/${t.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Cômodos
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(t)}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => duplicateTypology(projectId, t.id),
                      `“${t.nome}” duplicada.`,
                    )
                  }
                >
                  Duplicar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleting(t)}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TypologyFormDialog
        projectId={projectId}
        typologyId={editing && editing !== "new" ? editing.id : undefined}
        defaultValues={
          editing && editing !== "new" ? toInput(editing) : EMPTY_TYPOLOGY
        }
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir “{deleting?.nome}”?</DialogTitle>
            <DialogDescription>
              Os cômodos desta tipologia também serão apagados.
              {deleting && deleting.unitCount > 0
                ? ` ${plural(deleting.unitCount, "unidade ficará", "unidades ficarão")} sem tipologia (as unidades continuam).`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const target = deleting;
                if (!target) return;
                setDeleting(null);
                run(
                  () => deleteTypology(projectId, target.id),
                  "Tipologia excluída.",
                );
              }}
            >
              Excluir tipologia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
