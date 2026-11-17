"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { describedBy, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  contrastWithWhite,
  DEFAULT_BRAND_COLOR,
  formatPhone,
  HEX_COLOR,
  profileSchema,
  type ProfileData,
  type ProfileFormInput,
} from "@/lib/validacoes/perfil";

import { updateProfile } from "./actions";

const WHATSAPP_HINT = "Com DDD. É o número que o cliente chama pelo tour.";
const CRECI_HINT = "Aparece no tour, junto com o seu nome.";

export function ProfileForm({ defaults }: { defaults: ProfileFormInput }) {
  const form = useForm<ProfileFormInput, unknown, ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });
  const { errors, isSubmitting } = form.formState;

  // brandColor has ONE source: the text input (register). The color picker
  // reads it and writes back through setValue, so both always match.
  const brandColor = useWatch({ control: form.control, name: "brandColor" });
  const validColor = HEX_COLOR.test(brandColor)
    ? brandColor.toLowerCase()
    : DEFAULT_BRAND_COLOR;
  const lowContrast = contrastWithWhite(validColor) < 4.5;

  async function onSubmit(saved: ProfileData) {
    try {
      // Send what the broker TYPED (strings): the server validates it again
      // with the same schema. The transformed output may contain nulls.
      const result = await updateProfile(form.getValues());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Show the values the way they were saved: (11) 99999-9999, lowercase color.
      form.reset({
        ...form.getValues(),
        whatsapp: formatPhone(saved.whatsapp),
        creci: saved.creci ?? "",
        brandColor: saved.brandColor,
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
      <FormField id="name" label="Nome" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name", {
            error: errors.name?.message,
          })}
          {...form.register("name")}
        />
      </FormField>

      <FormField
        id="whatsapp"
        label="WhatsApp"
        hint={WHATSAPP_HINT}
        error={errors.whatsapp?.message}
      >
        <Input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          aria-invalid={Boolean(errors.whatsapp)}
          aria-describedby={describedBy("whatsapp", {
            error: errors.whatsapp?.message,
            hint: WHATSAPP_HINT,
          })}
          {...form.register("whatsapp")}
        />
      </FormField>

      <FormField
        id="creci"
        label="CRECI"
        hint={CRECI_HINT}
        error={errors.creci?.message}
      >
        <Input
          id="creci"
          placeholder="CRECI-SP 123456"
          aria-invalid={Boolean(errors.creci)}
          aria-describedby={describedBy("creci", {
            error: errors.creci?.message,
            hint: CRECI_HINT,
          })}
          {...form.register("creci")}
        />
      </FormField>

      <FormField
        id="brandColor"
        label="Cor da sua marca"
        error={errors.brandColor?.message}
      >
        <div className="flex items-center gap-3">
          <input
            type="color"
            aria-label="Escolher a cor"
            value={validColor}
            onChange={(event) =>
              form.setValue("brandColor", event.target.value.toLowerCase(), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            className="size-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
          />
          <Input
            id="brandColor"
            className="max-w-32 font-mono uppercase"
            maxLength={7}
            aria-invalid={Boolean(errors.brandColor)}
            aria-describedby={describedBy("brandColor", {
              error: errors.brandColor?.message,
            })}
            {...form.register("brandColor")}
          />
        </div>
      </FormField>

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
              aria-describedby="notifyLeadsByEmail-hint"
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="notifyLeadsByEmail">
                Receber e-mail a cada novo interessado
              </Label>
              <p
                id="notifyLeadsByEmail-hint"
                className="text-sm text-muted-foreground"
              >
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
