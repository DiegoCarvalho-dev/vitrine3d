import { z } from "zod";

// Project (empreendimento) forms. Same rules as the database
// (supabase/migrations/20261116215353_perfis_empreendimentos.sql).

export const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

/** Same format the DB checks and slugify() produces: a-z, 0-9 and single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const projectTypeSchema = z.enum(["predio", "casa"]);
export type ProjectType = z.infer<typeof projectTypeSchema>;

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .min(1, `Informe ${label}.`)
    .pipe(z.coerce.number({ message: `Informe ${label}.` }))
    .pipe(
      z
        .number()
        .int(`Use um número inteiro em ${label}.`)
        .min(min, `${label[0].toUpperCase()}${label.slice(1)}: mínimo ${min}.`)
        .max(max, `${label[0].toUpperCase()}${label.slice(1)}: máximo ${max}.`),
    );

export const createProjectSchema = z
  .object({
    type: projectTypeSchema,
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome.")
      .max(120, "Nome longo demais."),
    slug: z
      .string()
      .trim()
      .min(1, "Informe o link.")
      .max(80, "Link longo demais (máx. 80).")
      .regex(
        SLUG_PATTERN,
        "Use só letras minúsculas, números e hífens (ex.: edificio-solar).",
      ),
    city: z
      .string()
      .trim()
      .min(1, "Informe a cidade.")
      .max(80, "Cidade longa demais."),
    state: z.enum(BRAZILIAN_STATES, { message: "Escolha a UF." }),
    floors: z.string().trim(),
    unitsPerFloor: z.string().trim(),
  })
  .transform((data, ctx) => {
    // Building: floors and units per floor are required (they generate the 3D).
    // House: no floors/units (a single unit).
    if (data.type === "casa")
      return { ...data, floors: null, unitsPerFloor: null };

    const floors = wholeNumber("o número de andares", 1, 200).safeParse(
      data.floors,
    );
    const units = wholeNumber("as unidades por andar", 1, 50).safeParse(
      data.unitsPerFloor,
    );
    if (!floors.success) {
      ctx.addIssue({
        code: "custom",
        path: ["floors"],
        message: floors.error.issues[0].message,
      });
    }
    if (!units.success) {
      ctx.addIssue({
        code: "custom",
        path: ["unitsPerFloor"],
        message: units.error.issues[0].message,
      });
    }
    if (!floors.success || !units.success) return z.NEVER;
    return { ...data, floors: floors.data, unitsPerFloor: units.data };
  });

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProjectData = z.output<typeof createProjectSchema>;

export const PROJECT_STATUS_LABEL = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
} as const;
