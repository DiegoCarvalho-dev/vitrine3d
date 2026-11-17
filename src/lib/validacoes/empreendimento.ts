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
    // Only digits: Number() would also accept "1e2", "0x10" and "0b11".
    .regex(/^\d+$/, `Use só números em ${label}.`)
    .pipe(z.coerce.number({ message: `Informe ${label}.` }))
    .pipe(
      z
        .number()
        .int(`Use um número inteiro em ${label}.`)
        .min(min, `${label[0].toUpperCase()}${label.slice(1)}: mínimo ${min}.`)
        .max(max, `${label[0].toUpperCase()}${label.slice(1)}: máximo ${max}.`),
    );

const baseFields = {
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
};

/**
 * Building: floors and units per floor are required (they generate the 3D).
 * House: no floors/units (a single unit).
 */
function parseBuildingSize<
  T extends { type: ProjectType; floors: string; unitsPerFloor: string },
>(data: T, ctx: z.RefinementCtx) {
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
}

export const createProjectSchema = z
  .object(baseFields)
  .transform(parseBuildingSize);

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type CreateProjectData = z.output<typeof createProjectSchema>;

/** Optional text: trimmed; empty becomes null (the DB column is nullable). */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

/** Optional date from <input type="date"> (YYYY-MM-DD); empty becomes null. */
const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
        new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)),
    "Data inválida.",
  )
  .transform((value) => value || null);

/** Edit form: the creation fields plus the details the buyer sees. */
export const updateProjectSchema = z
  .object({
    ...baseFields,
    description: optionalText(5000, "Descrição longa demais (máx. 5000)."),
    address: optionalText(200, "Endereço longo demais."),
    // "Segurança da compra" (docs/05, O6/O2)
    builder: optionalText(120, "Nome da construtora longo demais."),
    incorporationRegistry: optionalText(80, "Registro longo demais."),
    deliveryForecast: optionalDate, // empty = ready to move in
    checkedAt: optionalDate,
  })
  .transform(parseBuildingSize);

export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type UpdateProjectData = z.output<typeof updateProjectSchema>;

export const projectStatusSchema = z.enum([
  "rascunho",
  "publicado",
  "arquivado",
]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const PROJECT_STATUS_LABEL = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
} as const;

/** A project id from the URL or a form (strict UUID). */
export const projectIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Empreendimento não encontrado.",
  );

/** What the broker types to confirm a deletion (compared with the name). */
export const deleteConfirmationSchema = z.string().max(200);
