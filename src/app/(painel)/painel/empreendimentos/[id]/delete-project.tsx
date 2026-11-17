"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { deleteProject } from "./actions";

/**
 * "Danger zone". Without leads: delete, typing the name to confirm.
 * With leads: no delete button; explains that archiving keeps the contacts.
 */
export function DeleteProject({
  projectId,
  projectName,
  leadCount,
}: {
  projectId: string;
  projectName: string;
  leadCount: number;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const matches = confirmation.trim() === projectName.trim();

  if (leadCount > 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="delete-blocked">
        Este empreendimento tem {leadCount}{" "}
        {leadCount === 1 ? "contato" : "contatos"} de clientes, por isso não
        pode ser excluído. Para tirá-lo do ar, use{" "}
        <strong className="text-foreground">Arquivar</strong>: os contatos ficam
        guardados.
      </p>
    );
  }

  function onDelete() {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await deleteProject(projectId, confirmation);
        if (result && !result.ok) {
          if (result.field === "confirmation") setError(result.error);
          else toast.error(result.error);
        }
      } catch (caught) {
        unstable_rethrow(caught); // redirect() to /painel after deleting
        toast.error(
          "Não foi possível conectar. Verifique a internet e tente de novo.",
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Apaga o empreendimento, as plantas, as unidades e as fotos. Não dá para
        desfazer.
      </p>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation("");
            setError(undefined);
          }
        }}
      >
        <DialogTrigger render={<Button variant="destructive" />}>
          Excluir empreendimento
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir “{projectName}”?</DialogTitle>
            <DialogDescription>
              Isso apaga o empreendimento, as plantas, as unidades e as fotos.
              Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmation">
              Digite o nome do empreendimento para confirmar
            </Label>
            <Input
              id="confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "confirmation-error" : undefined}
            />
            {error && (
              <p id="confirmation-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={!matches || pending}
            >
              {pending ? "Excluindo…" : "Excluir de vez"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
