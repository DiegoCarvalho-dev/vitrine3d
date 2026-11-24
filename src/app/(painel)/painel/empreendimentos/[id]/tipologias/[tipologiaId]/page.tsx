import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getMyTypology, listRooms } from "@/lib/empreendimentos/queries";
import { roundArea } from "@/lib/planta/geometry";
import { floorPlanSchema, roomGeometrySchema } from "@/lib/validacoes/planta";

import { type EditorRoom, RoomsEditor } from "./rooms-editor";

type Props = PageProps<"/painel/empreendimentos/[id]/tipologias/[tipologiaId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, tipologiaId } = await params;
  const loaded = await getMyTypology(id, tipologiaId);
  return {
    title: `${loaded?.typology.nome ?? "Tipologia"} | Vitrine 3D`,
    robots: { index: false },
  };
}

export default async function TypologyPage({ params }: Props) {
  const { id, tipologiaId } = await params;
  const loaded = await getMyTypology(id, tipologiaId);
  // Someone else's (or a non-existent) typology: 404, never "forbidden".
  if (!loaded) notFound();
  const { project, typology } = loaded;

  const rooms: EditorRoom[] = (await listRooms(typology.id)).flatMap((room) => {
    const geometry = roomGeometrySchema.safeParse(room.geometria);
    if (!geometry.success) return []; // invalid shape: never breaks the page
    return [
      {
        id: room.id,
        name: room.nome,
        type: room.tipo,
        description: room.descricao,
        points: geometry.data.pontos,
        area: room.area_m2 ?? roundArea(geometry.data.pontos),
        ceilingHeight: geometry.data.pe_direito,
      },
    ];
  });

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          href={`/painel/empreendimentos/${project.id}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← {project.nome}
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded">
          {typology.nome}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Desenhe os cômodos na grade (cada quadrado é 1 m) ou digite as
          medidas. O tour em 3D é gerado a partir desta planta.
        </p>
      </div>
      <RoomsEditor
        projectId={project.id}
        typologyId={typology.id}
        rooms={rooms}
        privateArea={typology.area_privativa_m2}
        // Saved doors/windows; invalid or empty → automatic doors (#49).
        plan={floorPlanSchema.safeParse(typology.planta).data}
      />
    </section>
  );
}
