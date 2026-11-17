"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { describedBy, FormField } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slugify";
import {
  BRAZILIAN_STATES,
  createProjectSchema,
  type CreateProjectData,
  type CreateProjectInput,
} from "@/lib/validacoes/empreendimento";

import { createProject } from "./actions";

const TYPE_OPTIONS = [
  { value: "predio", label: "Prédio", hint: "Várias unidades por andar" },
  { value: "casa", label: "Casa", hint: "Uma unidade só" },
] as const;

const SLUG_HINT = "É o final do link que você manda para o cliente.";

export function CreateProjectForm() {
  const form = useForm<CreateProjectInput, unknown, CreateProjectData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      type: "predio",
      name: "",
      slug: "",
      city: "",
      state: "SP",
      floors: "",
      unitsPerFloor: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const type = useWatch({ control: form.control, name: "type" });
  const slug = useWatch({ control: form.control, name: "slug" });

  const nameField = form.register("name", {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      // Once the broker edits the link by hand (dirty), the name stops
      // overwriting it. setValue below doesn't mark the field as dirty.
      // isTouched stays true even if the broker clears the link afterwards.
      const slugState = form.getFieldState("slug");
      if (!slugState.isDirty && !slugState.isTouched) {
        // Cutting at 80 can leave a trailing hyphen, which the DB rejects.
        const generated = slugify(event.target.value)
          .slice(0, 80)
          .replace(/-+$/, "");
        form.setValue("slug", generated, {
          shouldValidate: false,
        });
      }
    },
  });
  const slugField = form.register("slug");

  async function onSubmit() {
    try {
      // Raw strings go to the server, which validates them again.
      const result = await createProject(form.getValues());
      if (result?.field) {
        form.setError(
          result.field,
          { message: result.error },
          { shouldFocus: true },
        );
      } else if (result?.error) {
        toast.error(result.error);
      }
    } catch (error) {
      // redirect() works by throwing: hand it back to Next.js instead of
      // showing "no connection" after a successful creation.
      unstable_rethrow(error);
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
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="grid grid-cols-2 gap-3">
          {TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer flex-col rounded-lg border p-3 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  value={option.value}
                  className="accent-primary"
                  {...form.register("type")}
                />
                {option.label}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                {option.hint}
              </span>
            </label>
          ))}
        </div>
        {errors.type?.message && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {errors.type.message}
          </p>
        )}
      </fieldset>

      <FormField
        id="name"
        label="Nome do empreendimento"
        error={errors.name?.message}
      >
        <Input
          id="name"
          placeholder="Residencial Bela Vista"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name", {
            error: errors.name?.message,
          })}
          {...nameField}
        />
      </FormField>

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
            {...slugField}
          />
        </div>
        {slug && !errors.slug && (
          <p
            className="text-sm text-muted-foreground"
            data-testid="slug-preview"
          >
            Seu link:{" "}
            <span className="font-medium text-foreground">/e/{slug}</span>
          </p>
        )}
      </FormField>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <FormField id="city" label="Cidade" error={errors.city?.message}>
          <Input
            id="city"
            autoComplete="address-level2"
            aria-invalid={Boolean(errors.city)}
            aria-describedby={describedBy("city", {
              error: errors.city?.message,
            })}
            {...form.register("city")}
          />
        </FormField>
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

      {type === "predio" && (
        <div className="grid grid-cols-2 gap-3">
          <FormField id="floors" label="Andares" error={errors.floors?.message}>
            <Input
              id="floors"
              inputMode="numeric"
              placeholder="10"
              aria-invalid={Boolean(errors.floors)}
              aria-describedby={describedBy("floors", {
                error: errors.floors?.message,
              })}
              {...form.register("floors")}
            />
          </FormField>
          <FormField
            id="unitsPerFloor"
            label="Unidades por andar"
            error={errors.unitsPerFloor?.message}
          >
            <Input
              id="unitsPerFloor"
              inputMode="numeric"
              placeholder="4"
              aria-invalid={Boolean(errors.unitsPerFloor)}
              aria-describedby={describedBy("unitsPerFloor", {
                error: errors.unitsPerFloor?.message,
              })}
              {...form.register("unitsPerFloor")}
            />
          </FormField>
        </div>
      )}

      <div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando…" : "Criar empreendimento"}
        </Button>
      </div>
    </form>
  );
}
