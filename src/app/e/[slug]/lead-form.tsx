"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { describedBy, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sessionId } from "@/lib/tour/events";
import { whatsappLink, whatsappMessage } from "@/lib/tour/whatsapp";
import {
  type LeadData,
  type LeadFormInput,
  leadSchema,
} from "@/lib/validacoes/lead";

import { sendLead } from "./actions";

const EMPTY: LeadFormInput = {
  name: "",
  phone: "",
  email: "",
  message: "",
  consent: false, // starts unchecked; sending requires it
  unitId: "",
  website: "",
};

/**
 * "Tenho interesse" (issue #69): name and a contact, with LGPD consent. On
 * the unit page the unit comes filled in. After sending: what happens next
 * and the WhatsApp shortcut.
 */
export function LeadForm({
  projectId,
  projectName,
  brokerName,
  brokerPhone,
  unit,
  origin,
}: {
  projectId: string;
  projectName: string;
  brokerName: string;
  brokerPhone: string | null | undefined;
  unit?: { id: string; number: string } | null;
  /** ?utm_source of the link (where the visitor came from). */
  origin: string | null;
}) {
  const form = useForm<LeadFormInput, unknown, LeadData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { ...EMPTY, unitId: unit?.id ?? "" },
  });
  const { errors, isSubmitting } = form.formState;
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(_lead: LeadData, event?: React.BaseSyntheticEvent) {
    setServerError(null);
    // Time since the page opened: a bot sends at once; a person, even with
    // the phone's autofill, takes a few seconds.
    const fillMs = Math.round(event?.timeStamp ?? 0);
    try {
      // The raw values (what was typed): the server validates them again with
      // the same schema (the parsed `lead` has nulls and E.164 already).
      const result = await sendLead(form.getValues(), {
        projectId,
        origin,
        sessionId: sessionId(),
        fillMs,
      });
      if (result.ok) setSent(true);
      else setServerError(result.error);
    } catch {
      setServerError(
        "Não foi possível conectar. Verifique a internet e tente de novo.",
      );
    }
  }

  const whatsapp = whatsappLink(
    brokerPhone,
    whatsappMessage(projectName, unit?.number),
  );

  if (sent) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-lg border bg-card p-5"
        data-testid="lead-sent"
      >
        <p className="font-heading text-lg font-semibold">
          Recebemos seu interesse!
        </p>
        <p className="text-sm text-muted-foreground">
          {brokerName} vai entrar em contato em breve pelo telefone ou e-mail
          que você informou.
        </p>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start text-sm font-medium underline underline-offset-4"
          >
            Prefere agilizar? Chame no WhatsApp
            <span className="sr-only"> (abre em outra aba)</span>
          </a>
        )}
      </div>
    );
  }

  return (
    <form
      id="interesse"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-lg border p-5"
      aria-labelledby="lead-title"
      data-testid="lead-form"
    >
      <div>
        <h2 id="lead-title" className="font-heading text-xl font-semibold">
          Tenho interesse
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {unit
            ? `Deixe seu contato para saber mais sobre a unidade ${unit.number}.`
            : "Deixe seu contato e o corretor fala com você."}
        </p>
      </div>

      <FormField id="lead-name" label="Nome" error={errors.name?.message}>
        <Input
          id="lead-name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("lead-name", {
            error: errors.name?.message,
          })}
          {...form.register("name")}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="lead-phone"
          label="Telefone / WhatsApp"
          hint="Com DDD."
          error={errors.phone?.message}
        >
          <Input
            id="lead-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy("lead-phone", {
              error: errors.phone?.message,
              hint: "Com DDD.",
            })}
            {...form.register("phone")}
          />
        </FormField>
        <FormField id="lead-email" label="E-mail" error={errors.email?.message}>
          <Input
            id="lead-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy("lead-email", {
              error: errors.email?.message,
            })}
            {...form.register("email")}
          />
        </FormField>
      </div>
      <FormField
        id="lead-message"
        label="Mensagem (opcional)"
        error={errors.message?.message}
      >
        <Textarea
          id="lead-message"
          rows={3}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy("lead-message", {
            error: errors.message?.message,
          })}
          {...form.register("message")}
        />
      </FormField>

      {/* Bot trap: hidden from people and screen readers, never filled. */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="lead-website">Não preencha este campo</label>
        <input
          id="lead-website"
          tabIndex={-1}
          autoComplete="off"
          {...form.register("website")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <Controller
            control={form.control}
            name="consent"
            render={({ field }) => (
              <Checkbox
                id="lead-consent"
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-labelledby="lead-consent-label"
                aria-invalid={Boolean(errors.consent)}
                aria-describedby={
                  errors.consent ? "lead-consent-error" : undefined
                }
                className="mt-0.5"
              />
            )}
          />
          <Label
            id="lead-consent-label"
            htmlFor="lead-consent"
            className="leading-snug font-normal"
          >
            Concordo em enviar meus dados para {brokerName} entrar em contato
            sobre este imóvel.
          </Label>
        </div>
        <p className="pl-7 text-xs text-muted-foreground">
          Veja como seus dados são usados na{" "}
          <Link
            href="/privacidade"
            target="_blank"
            className="underline underline-offset-4"
          >
            política de privacidade
          </Link>
          .
        </p>
        {errors.consent && (
          <p
            id="lead-consent-error"
            data-testid="lead-consent-error"
            className="pl-7 text-sm text-destructive"
          >
            {errors.consent.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}
