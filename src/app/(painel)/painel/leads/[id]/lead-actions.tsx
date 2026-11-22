"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LEAD_STATUS_LABEL,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/leads/status";

import { deleteLead, setLeadStatus } from "../actions";

/** Status, quick actions (WhatsApp, copy e-mail) and delete on request. */
export function LeadActions({
  leadId,
  name,
  status,
  email,
  whatsappHref,
}: {
  leadId: string;
  name: string;
  status: LeadStatus;
  email: string | null;
  whatsappHref: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(status);
  const [confirming, setConfirming] = useState(false);

  function changeStatus(next: LeadStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next); // right away; goes back if saving fails
    startTransition(async () => {
      try {
        const result = await setLeadStatus(leadId, next);
        if (!result.ok) {
          setCurrent(previous);
          toast.error(result.error);
        } else {
          toast.success(`Situação: ${LEAD_STATUS_LABEL[next]}.`);
        }
      } catch {
        setCurrent(previous);
        toast.error("Não foi possível conectar. Tente de novo.");
      }
    });
  }

  async function copyEmail() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      toast.success("E-mail copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o e-mail e copie.");
    }
  }

  return (
    <>
      <section aria-labelledby="status-title" className="flex flex-col gap-2">
        <h2 id="status-title" className="font-heading text-lg font-semibold">
          Situação
        </h2>
        <div
          role="group"
          aria-labelledby="status-title"
          className="flex flex-wrap gap-2"
        >
          {LEAD_STATUSES.map((value) => (
            <Button
              key={value}
              type="button"
              size="lg"
              variant={value === current ? "default" : "outline"}
              aria-pressed={value === current}
              disabled={pending}
              onClick={() => changeStatus(value)}
            >
              {LEAD_STATUS_LABEL[value]}
            </Button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="lead-whatsapp"
            className="inline-flex h-10 items-center rounded-lg bg-[#1a7f4b] px-4 text-sm font-medium text-white hover:bg-[#15683d]"
          >
            Responder no WhatsApp
            <span className="sr-only"> (abre em outra aba)</span>
          </a>
        )}
        {email && (
          <Button type="button" variant="outline" size="lg" onClick={copyEmail}>
            Copiar e-mail
          </Button>
        )}
      </div>

      <section className="mt-4 flex flex-col gap-2 border-t pt-6">
        <h2 className="font-heading text-lg font-semibold">
          Apagar este contato
        </h2>
        <p className="text-sm text-muted-foreground">
          Se {name} pediu para ter os dados apagados (LGPD), apague aqui. Não dá
          para desfazer.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="self-start"
          onClick={() => setConfirming(true)}
        >
          Apagar contato
        </Button>
      </section>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar o contato de {name}?</DialogTitle>
            <DialogDescription>
              O nome, o telefone, o e-mail, a mensagem e o histórico de visitas
              dele no tour são apagados de vez. Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    const result = await deleteLead(leadId);
                    if (!result.ok) {
                      toast.error(result.error);
                      setConfirming(false);
                      return;
                    }
                    toast.success("Contato apagado.");
                    router.push("/painel/leads");
                  } catch {
                    toast.error(
                      "Não foi possível apagar agora. Verifique a internet e tente de novo.",
                    );
                    setConfirming(false);
                  }
                })
              }
            >
              Apagar de vez
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
