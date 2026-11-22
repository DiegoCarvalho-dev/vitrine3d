"use client";

import { track } from "@/lib/tour/events";
import { whatsappLink, whatsappMessage } from "@/lib/tour/whatsapp";

/**
 * "Falar no WhatsApp" (issue #68): fixed at the bottom on phones (thumb
 * reach) and in the corner on larger screens. Opens the broker's WhatsApp
 * with the message ready; the click is a visit event. No valid number: no
 * button (the interest form, issue #69, is the other way in).
 */
export function WhatsAppButton({
  projectId,
  projectName,
  phone,
  unit,
}: {
  projectId: string;
  projectName: string;
  /** The broker's WhatsApp in E.164. */
  phone: string | null | undefined;
  /** The unit being viewed, if any. */
  unit?: { id: string; number: string } | null;
}) {
  const href = whatsappLink(phone, whatsappMessage(projectName, unit?.number));
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="whatsapp-button"
      onClick={() =>
        track({
          empreendimentoId: projectId,
          unidadeId: unit?.id ?? null,
          tipo: "clicou_whatsapp",
          dados: { pagina: unit ? "unidade" : "predio" },
        })
      }
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#1a7f4b] px-5 text-sm font-medium text-white shadow-lg ring-1 ring-black/10 hover:bg-[#15683d] focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-5 fill-current"
        focusable="false"
      >
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-1.9 1.3-.5.1-1.1.1-1.8-.1a16 16 0 0 1-5.6-3.8c-1.4-1.5-2.2-3.2-2.4-3.8-.2-.6 0-1.4.5-2 .2-.2.4-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.4-.4.4c-.1.2-.3.3-.1.6.6 1 1.4 1.8 2.4 2.4.3.2.5.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.3 0 .2 0 .7-.2 1.3Z" />
      </svg>
      Falar no WhatsApp
      <span className="sr-only"> (abre em outra aba)</span>
    </a>
  );
}
