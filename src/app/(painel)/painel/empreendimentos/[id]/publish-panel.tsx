"use client";

import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { ProjectStatusBadge } from "@/components/project-status-badge";
import { Button } from "@/components/ui/button";
import type { PublishRequirement } from "@/lib/empreendimentos/publish";
import type { ProjectStatus } from "@/lib/validacoes/empreendimento";

import { setProjectStatus } from "./actions";

const SUCCESS: Record<ProjectStatus, string> = {
  publicado: "Publicado! O link já funciona para os clientes.",
  rascunho: "Voltou para rascunho. O link saiu do ar.",
  arquivado: "Arquivado. O link saiu do ar e os contatos ficam guardados.",
};

export function PublishPanel({
  projectId,
  status,
  checklist,
}: {
  projectId: string;
  status: ProjectStatus;
  checklist: PublishRequirement[];
}) {
  const [pending, startTransition] = useTransition();
  const ready = checklist.every((item) => item.done);

  function change(next: ProjectStatus) {
    startTransition(async () => {
      try {
        const result = await setProjectStatus(projectId, next);
        if (result.ok) toast.success(SUCCESS[next]);
        else toast.error(result.error);
      } catch {
        toast.error(
          "Não foi possível conectar. Verifique a internet e tente de novo.",
        );
      }
    });
  }

  return (
    <section
      aria-labelledby="publish-title"
      className="rounded-lg border bg-card p-4 sm:p-5"
      data-testid="publish-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="publish-title"
          className="flex items-center gap-2 font-heading text-lg font-semibold"
        >
          Publicação <ProjectStatusBadge status={status} />
        </h2>
        <div className="flex flex-wrap gap-2">
          {status === "rascunho" && (
            <Button
              onClick={() => change("publicado")}
              disabled={pending || !ready}
            >
              Publicar
            </Button>
          )}
          {status === "publicado" && (
            <Button
              variant="outline"
              onClick={() => change("rascunho")}
              disabled={pending}
            >
              Voltar para rascunho
            </Button>
          )}
          {status === "arquivado" ? (
            <Button
              variant="outline"
              onClick={() => change("rascunho")}
              disabled={pending}
            >
              Desarquivar
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => change("arquivado")}
              disabled={pending}
            >
              Arquivar
            </Button>
          )}
        </div>
      </div>

      {status === "rascunho" && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {ready
              ? "Tudo pronto. Ao publicar, o link passa a funcionar para os clientes."
              : "Para publicar, falta:"}
          </p>
          <ul
            className="mt-2 flex flex-col gap-1.5 text-sm"
            data-testid="publish-checklist"
          >
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                {item.done ? (
                  <Check aria-hidden className="size-4 text-primary" />
                ) : (
                  <X aria-hidden className="size-4 text-destructive" />
                )}
                <span
                  className={
                    item.done ? "text-muted-foreground line-through" : undefined
                  }
                >
                  {item.label}
                </span>
                <span className="sr-only">
                  {item.done ? "(feito)" : "(falta)"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {status === "arquivado" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Fora do ar. Os contatos recebidos continuam guardados.
        </p>
      )}
    </section>
  );
}
