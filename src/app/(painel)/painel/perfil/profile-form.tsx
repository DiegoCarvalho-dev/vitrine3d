"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  contrastWithWhite,
  formatPhone,
  profileSchema,
  type ProfileData,
  type ProfileFormInput,
} from "@/lib/validacoes/perfil";

import { updateProfile } from "./actions";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function ProfileForm({ defaults }: { defaults: ProfileFormInput }) {
  const form = useForm<ProfileFormInput, unknown, ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });
  const { errors, isSubmitting } = form.formState;
  const brandColor = useWatch({ control: form.control, name: "brandColor" });
  const validColor = HEX_COLOR.test(brandColor) ? brandColor : "#1b365d";
  const lowContrast = contrastWithWhite(validColor) < 4.5;

  async function onSubmit(values: ProfileData) {
    try {
      const result = await updateProfile(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Show the number the way it was saved: (11) 99999-9999.
      form.reset({
        ...form.getValues(),
        whatsapp: formatPhone(values.whatsapp),
        creci: values.creci ?? "",
        brandColor: values.brandColor,
      });
      toast.success("Perfil salvo.");
    } catch {
      toast.error(
        "Não foi possível conectar. Verifique a internet e tente de novo.",
      );
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <Field id="name" label="Nome" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          {...form.register("name")}
        />
      </Field>

      <Field
        id="whatsapp"
        label="WhatsApp"
        hint="Com DDD. É o número que o cliente chama pelo tour."
        error={errors.whatsapp?.message}
      >
        <Input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          aria-invalid={Boolean(errors.whatsapp)}
          {...form.register("whatsapp")}
        />
      </Field>

      <Field
        id="creci"
        label="CRECI"
        hint="Aparece no tour, junto com o seu nome."
        error={errors.creci?.message}
      >
        <Input
          id="creci"
          placeholder="CRECI-SP 123456"
          aria-invalid={Boolean(errors.creci)}
          {...form.register("creci")}
        />
      </Field>

      <Field
        id="brandColor"
        label="Cor da sua marca"
        error={errors.brandColor?.message}
      >
        <div className="flex items-center gap-3">
          <Controller
            control={form.control}
            name="brandColor"
            render={({ field }) => (
              <input
                type="color"
                aria-label="Escolher a cor"
                value={HEX_COLOR.test(field.value) ? field.value : "#1b365d"}
                onChange={(event) => field.onChange(event.target.value)}
                className="size-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
              />
            )}
          />
          <Input
            id="brandColor"
            className="max-w-32 font-mono uppercase"
            maxLength={7}
            aria-invalid={Boolean(errors.brandColor)}
            {...form.register("brandColor")}
          />
        </div>
      </Field>

      <div className="rounded-lg border bg-muted/50 p-4" aria-live="polite">
        <p className="text-sm text-muted-foreground">Prévia no tour</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white"
            style={{ backgroundColor: validColor }}
            data-testid="brand-preview"
          >
            Falar no WhatsApp
          </span>
          <span
            className="size-6 rounded-full border"
            style={{ backgroundColor: validColor }}
            aria-hidden
          />
        </div>
        {lowContrast && (
          <p className="mt-3 text-sm text-muted-foreground">
            Cor clara: o texto branco do botão fica difícil de ler. Prefira um
            tom mais escuro.
          </p>
        )}
      </div>

      <Controller
        control={form.control}
        name="notifyLeadsByEmail"
        render={({ field }) => (
          <div className="flex items-start gap-3">
            <Checkbox
              id="notifyLeadsByEmail"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="notifyLeadsByEmail">
                Receber e-mail a cada novo interessado
              </Label>
              <p className="text-sm text-muted-foreground">
                Com o que a pessoa olhou no tour, para você ligar primeiro para
                quem está mais interessado.
              </p>
            </div>
          </div>
        )}
      />

      <div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar perfil"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" data-testid={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
