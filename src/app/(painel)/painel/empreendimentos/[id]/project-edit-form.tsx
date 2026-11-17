"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { describedBy, FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BRAZILIAN_STATES,
  type UpdateProjectData,
  type UpdateProjectInput,
  updateProjectSchema,
} from "@/lib/validacoes/empreendimento";

import { updateProject } from "./actions";

type Field = keyof UpdateProjectInput;

const SLUG_HINT =
  "Final do link enviado ao cliente. Se já estiver publicado, o link antigo para de funcionar.";
const DELIVERY_HINT = "Deixe vazio se o imóvel já está pronto.";
const CHECKED_HINT = "Quando você conferiu esses dados com a construtora.";

export function ProjectEditForm({
  projectId,
  defaultValues,
  unitCount,
}: {
  projectId: string;
  defaultValues: UpdateProjectInput;
  unitCount: number;
}) {
  const form = useForm<UpdateProjectInput, unknown, UpdateProjectData>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues,
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;
  const isBuilding =
    useWatch({ control: form.control, name: "type" }) === "predio";
  const sizeChanged = Boolean(dirtyFields.floors || dirtyFields.unitsPerFloor);

  async function onSubmit() {
    try {
      // Raw strings go to the server, which validates them again.
      const result = await updateProject(projectId, form.getValues());
      if (result.ok) {
        toast.success("Alterações salvas.");
        form.reset(form.getValues()); // the saved values become the new baseline
      } else if (result.field && result.field in defaultValues) {
        form.setError(
          result.field as Field,
          { message: result.error },
          { shouldFocus: true },
        );
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(
        "Não foi possível conectar. Verifique a internet e tente de novo.",
      );
    }
  }

  const text = (
    id: Field,
    label: string,
    hint?: string,
    props?: React.ComponentProps<"input">,
  ) => (
    <FormField id={id} label={label} hint={hint} error={errors[id]?.message}>
      <Input
        id={id}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={describedBy(id, { error: errors[id]?.message, hint })}
        {...props}
        {...form.register(id)}
      />
    </FormField>
  );

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-10"
    >
      <fieldset className="flex flex-col gap-6">
        <legend className="mb-4 font-heading text-xl font-semibold">
          Dados
        </legend>
        {text("name", "Nome do empreendimento")}
        <FormField
          id="slug"
          label="Link"
          hint={SLUG_HINT}
          error={errors.slug?.message}
        >
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="shrink-0">/e/</span>
            <Input
              id="slug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={describedBy("slug", {
                error: errors.slug?.message,
                hint: SLUG_HINT,
              })}
              {...form.register("slug")}
            />
          </div>
        </FormField>
        <FormField
          id="description"
          label="Descrição"
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={4}
            placeholder="Lazer, diferenciais, localização…"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy("description", {
              error: errors.description?.message,
            })}
            {...form.register("description")}
          />
        </FormField>
        {text("address", "Endereço", undefined, {
          autoComplete: "street-address",
        })}
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          {text("city", "Cidade", undefined, {
            autoComplete: "address-level2",
          })}
          <FormField id="state" label="UF" error={errors.state?.message}>
            <NativeSelect
              id="state"
              aria-invalid={Boolean(errors.state)}
              {...form.register("state")}
            >
              {BRAZILIAN_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
        {isBuilding && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-3">
              {text("floors", "Andares", undefined, { inputMode: "numeric" })}
              {text("unitsPerFloor", "Unidades por andar", undefined, {
                inputMode: "numeric",
              })}
            </div>
            {sizeChanged && unitCount > 0 && (
              <p
                role="status"
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                Já existem {unitCount} unidades geradas. Mudar o tamanho do
                prédio não altera essas unidades: gere a grade de novo depois de
                salvar.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <legend className="mb-2 font-heading text-xl font-semibold">
          Segurança da compra
        </legend>
        <p className="text-sm text-muted-foreground">
          Aparece para o comprador no tour. Dados que passam confiança na hora
          de decidir.
        </p>
        {text("builder", "Construtora")}
        {text("incorporationRegistry", "Registro de incorporação", undefined, {
          placeholder: "Ex.: R.5/123.456",
        })}
        <div className="grid gap-6 sm:grid-cols-2">
          {text("deliveryForecast", "Previsão de entrega", DELIVERY_HINT, {
            type: "date",
          })}
          {text("checkedAt", "Informações conferidas em", CHECKED_HINT, {
            type: "date",
          })}
        </div>
      </fieldset>

      <div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
