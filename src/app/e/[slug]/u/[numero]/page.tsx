import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { STATUS_LABEL } from "@/lib/building";
import { getPublicEnv } from "@/lib/env";
import { roundArea } from "@/lib/planta/geometry";
import { filtersToSearch, parseFilters } from "@/lib/tour/filters";
import { getPublishedUnit } from "@/lib/tour/queries";
import { priceLabel, typologyRows } from "@/lib/tour/unit-sheet";
import { roomTypeSchema } from "@/lib/validacoes/comodo";
import { publicImageUrl } from "@/lib/validacoes/midia";
import { formatDecimal } from "@/lib/validacoes/numero";
import { floorPlanSchema, roomGeometrySchema } from "@/lib/validacoes/planta";

import { brandColor, TourHeader } from "../../tour-header";
import { VisitTracker } from "../../visit-tracker";
import { LeadForm } from "../../lead-form";
import { WhatsAppButton } from "../../whatsapp-button";
import { type UnitRoom, UnitTour } from "./unit-tour";

// Inside one unit (issue #52): its own link for the broker to send ("olha a
// 902"). Same anonymous data as the building page: never the hidden price.

type Props = PageProps<"/e/[slug]/u/[numero]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, numero } = await params;
  const data = await getPublishedUnit(slug, numero);
  if (!data) return { title: "Unidade não encontrada | Vitrine 3D" };
  const { project, unit, typology } = data;
  const title = `Unidade ${unit.numero} – ${project.nome}`;
  const description = [
    typology?.nome,
    // No "0 quartos" (studio): the typology name already says it.
    typology?.quartos
      ? `${typology.quartos} ${typology.quartos === 1 ? "quarto" : "quartos"}`
      : null,
    typology?.area_privativa_m2
      ? `${formatDecimal(typology.area_privativa_m2)} m²`
      : null,
    // Public price only: a unit "sob consulta" shows no value.
    unit.preco_publico !== null ? priceLabel(unit.preco_publico) : null,
    "Veja por dentro em 3D.",
  ]
    .filter(Boolean)
    .join(" · ");
  const cover = publicImageUrl(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    project.capa_url,
  );
  const images = [{ url: cover ?? `/e/${slug}/og`, alt: project.nome }];
  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Vitrine 3D",
      title,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function UnitPage({ params, searchParams }: Props) {
  const { slug, numero } = await params;
  const data = await getPublishedUnit(slug, numero);
  // Unit or project not published / nonexistent: the same 404.
  if (!data) notFound();
  const { project, broker, unit, typology } = data;

  // "Voltar ao prédio" keeps the filters and reopens this unit's sheet.
  const query = await searchParams;
  const back = new URLSearchParams(filtersToSearch(parseFilters(query)));
  back.set("unidade", unit.numero);

  const rooms: UnitRoom[] = data.rooms.flatMap((room) => {
    const type = roomTypeSchema.safeParse(room.tipo);
    const geometry = roomGeometrySchema.safeParse(room.geometria);
    if (!type.success || !geometry.success) return []; // never breaks the page
    return [
      {
        id: room.id,
        name: room.nome,
        type: type.data,
        description: room.descricao,
        points: geometry.data.pontos,
        height: geometry.data.pe_direito,
        area: room.area_m2 ?? roundArea(geometry.data.pontos),
      },
    ];
  });
  const plan = floorPlanSchema.safeParse(data.plan).data;
  // Hidden while walking (the joystick is there): UnitTour decides.
  const whatsapp = (
    <WhatsAppButton
      projectId={project.id}
      projectName={project.nome}
      phone={broker?.whatsapp}
      unit={{ id: unit.id, number: unit.numero }}
    />
  );

  return (
    <div
      className="min-h-dvh bg-background"
      style={{ "--brand": brandColor(broker) } as React.CSSProperties}
    >
      <TourHeader broker={broker} />
      <VisitTracker projectId={project.id} unitId={unit.id} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <Link
          href={`/e/${slug}?${back}`}
          className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Voltar ao prédio
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{project.nome}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
              Unidade {unit.numero}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm">
              {unit.andar}º andar ·
              <span
                aria-hidden
                className="size-3 rounded-sm"
                style={{ background: `var(--status-${unit.status})` }}
              />
              {STATUS_LABEL[unit.status]}
            </p>
          </div>
          <p
            className="text-2xl font-semibold tabular-nums"
            data-testid="unit-price"
          >
            {priceLabel(unit.preco_publico)}
          </p>
        </div>

        {rooms.length ? (
          <UnitTour
            projectId={project.id}
            unitId={unit.id}
            whatsapp={whatsapp}
            rooms={rooms}
            plan={plan}
            privateArea={typology?.area_privativa_m2 ?? null}
          />
        ) : (
          <p
            className="rounded-lg border bg-card p-8 text-center text-muted-foreground"
            data-testid="unit-no-plan"
          >
            A planta desta unidade ainda não foi cadastrada. Fale com o corretor
            para conhecer os detalhes.
          </p>
        )}

        {typology && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {typologyRows(typology).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="max-w-2xl">
          <LeadForm
            projectId={project.id}
            projectName={project.nome}
            brokerName={broker?.nome ?? "O corretor"}
            brokerPhone={broker?.whatsapp}
            unit={{ id: unit.id, number: unit.numero }}
            origin={
              typeof query.utm_source === "string"
                ? query.utm_source.slice(0, 100)
                : null
            }
          />
        </div>
      </main>
      {!rooms.length && whatsapp}
      {/* Bottom space so the fixed WhatsApp button never covers the text. */}
      <footer className="border-t px-4 pt-6 pb-24 text-center text-xs text-muted-foreground">
        Imagens ilustrativas. Valores e disponibilidade sujeitos a confirmação
        com o corretor.
        <br />
        Registramos as páginas vistas neste tour, sem dados pessoais, para o
        corretor saber o que mais interessou.
      </footer>
    </div>
  );
}
