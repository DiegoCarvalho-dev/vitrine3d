"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { describedBy, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type TypologyData,
  type TypologyInput,
  typologySchema,
} from "@/lib/validacoes/tipologia";

import { createTypology, updateTypology } from "./actions";

export const EMPTY_TYPOLOGY: TypologyInput = {
  name: "",
  bedrooms: "2",
  suites: "0",
  bathrooms: "1",
  parkingSpots: "1",
  privateArea: "",
};

const COUNTS = [
  ["bedrooms", "Quartos"],
  ["suites", "Suítes"],
  ["bathrooms", "Banheiros"],
  ["parkingSpots", "Vagas"],
] as const;

/** Create (typologyId undefined) or edit a typology in a dialog. */
export function TypologyFormDialog({
  projectId,
  typologyId,
  defaultValues,
  open,
  onOpenChange,
}: {
  projectId: string;
  typologyId?: string;
  defaultValues: TypologyInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formError, setFormError] = useState<string>();
  const form = useForm<TypologyInput, unknown, TypologyData>({
    resolver: zodResolver(typologySchema),
    defaultValues, // the dialog is remounted on each open
  });
  const { errors, isSubmitting } = form.formState;
  const editing = Boolean(typologyId);

  async function onSubmit() {
    setFormError(undefined);
    try {
      const values = form.getValues(); // raw strings: validated again on the server
      const result = editing
        ? await updateTypology(projectId, typologyId, values)
        : await createTypology(projectId, values);
      if (result.ok) {
        toast.success(editing ? "Tipologia salva." : "Tipologia criada.");
        onOpenChange(false);
      } else if (result.field && result.field in EMPTY_TYPOLOGY) {
        form.setError(
          result.field as keyof TypologyInput,
          { message: result.error },
          { shouldFocus: true },
        );
      } else {
        setFormError(result.error);
      }
    } catch {
      setFormError(
        "Não foi possível conectar. Verifique a internet e tente de novo.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar tipologia" : "Nova tipologia"}
          </DialogTitle>
          <DialogDescription>
            A planta que se repete no prédio, como “Tipo A, 2 quartos”.
          </DialogDescription>
        </DialogHeader>
        <form
          id="typology-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <FormField
            id="typology-name"
            label="Nome"
            error={errors.name?.message}
          >
            <Input
              id="typology-name"
              placeholder="Tipo A"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("typology-name", {
                error: errors.name?.message,
              })}
              {...form.register("name")}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COUNTS.map(([field, label]) => (
              <FormField
                key={field}
                id={`typology-${field}`}
                label={label}
                error={errors[field]?.message}
              >
                <Input
                  id={`typology-${field}`}
                  inputMode="numeric"
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={describedBy(`typology-${field}`, {
                    error: errors[field]?.message,
                  })}
                  {...form.register(field)}
                />
              </FormField>
            ))}
          </div>
          <FormField
            id="typology-area"
            label="Área privativa (m²)"
            hint="Opcional. Aceita vírgula: 65,5"
            error={errors.privateArea?.message}
          >
            <Input
              id="typology-area"
              inputMode="decimal"
              placeholder="65,5"
              aria-invalid={Boolean(errors.privateArea)}
              aria-describedby={describedBy("typology-area", {
                error: errors.privateArea?.message,
                hint: "Opcional. Aceita vírgula: 65,5",
              })}
              {...form.register("privateArea")}
            />
          </FormField>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" form="typology-form" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando…"
              : editing
                ? "Salvar"
                : "Criar tipologia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
