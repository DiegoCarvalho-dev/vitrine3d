import { z } from "zod";

// Formato da planta (docs/03-modelagem-de-dados.md, "Formato da planta").
// Tudo em METROS, com origem (0,0) no canto inferior esquerdo da unidade.
// Validado aqui antes de salvar em comodos.geometria e tipologias.planta.

const coordenada = z
  .number()
  .finite()
  .min(0, "Coordenada negativa: a origem (0,0) é o canto inferior esquerdo.")
  .max(100, "Coordenada acima de 100 m.");

export const pontoSchema = z.tuple([coordenada, coordenada]);
export type Ponto = z.infer<typeof pontoSchema>;

/** Área de um polígono simples (fórmula do cadarço), em m². */
export function areaDoPoligono(pontos: readonly Ponto[]): number {
  let soma = 0;
  for (let i = 0; i < pontos.length; i++) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length];
    soma += x1 * y2 - x2 * y1;
  }
  return Math.abs(soma) / 2;
}

// comodos.geometria
export const geometriaComodoSchema = z
  .object({
    tipo: z.literal("poligono"),
    pontos: z
      .array(pontoSchema)
      .min(3, "Um cômodo precisa de pelo menos 3 pontos.")
      .max(64),
    pe_direito: z.number().min(2.2).max(6).default(2.7),
  })
  .refine((g) => areaDoPoligono(g.pontos) > 0.5, {
    message: "O cômodo precisa ter área (mais de 0,5 m²).",
    path: ["pontos"],
  });
export type GeometriaComodo = z.infer<typeof geometriaComodoSchema>;

// tipologias.planta (elementos extras além dos cômodos)
const segmentoSchema = z.object({ de: pontoSchema, ate: pontoSchema });

export const plantaSchema = z.object({
  versao: z.literal(1),
  portas: z.array(segmentoSchema).max(200).default([]),
  janelas: z
    .array(
      segmentoSchema.extend({
        peitoril: z.number().min(0).max(3),
        altura: z.number().min(0.2).max(3),
      }),
    )
    .max(200)
    .default([]),
});
export type Planta = z.infer<typeof plantaSchema>;
