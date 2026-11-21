import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BuildingIllustration } from "@/components/building-illustration";
import { STATUS_LABEL, UNIT_STATUSES } from "@/lib/building";
import { getPublicEnv } from "@/lib/env";
import {
  checkedAtLabel,
  deliveryLabel,
  lowestPublicPrice,
  statusCounts,
} from "@/lib/tour/format";
import { getPublishedProject } from "@/lib/tour/queries";
import { publicImageUrl } from "@/lib/validacoes/midia";
import { formatDecimal } from "@/lib/validacoes/numero";
import {
  contrastWithWhite,
  DEFAULT_BRAND_COLOR,
  HEX_COLOR,
} from "@/lib/validacoes/perfil";
import { formatMoney } from "@/lib/validacoes/unidade";

type Props = PageProps<"/e/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await getPublishedProject((await params).slug);
  if (!tour) return { title: "Empreendimento não encontrado | Vitrine 3D" };
  const { project } = tour;
  const place = [project.cidade, project.uf].filter(Boolean).join(" / ");
  // Full Open Graph preview (WhatsApp) comes in issue #47.
  return {
    title: `${project.nome}${place ? ` – ${place}` : ""}`,
    description:
      project.descricao?.slice(0, 160) ?? `Conheça o ${project.nome} em 3D.`,
  };
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export default async function TourPage({ params }: Props) {
  const tour = await getPublishedProject((await params).slug);
  // Not published (rascunho/arquivado) or nonexistent: same 404.
  if (!tour) notFound();
  const { project, broker, typologies, units } = tour;

  const supabaseUrl = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  const cover = publicImageUrl(supabaseUrl, project.capa_url);
  const avatar = publicImageUrl(supabaseUrl, broker?.avatar_url);
  const logo = publicImageUrl(supabaseUrl, broker?.logo_url);
  const brand =
    broker?.cor_marca && HEX_COLOR.test(broker.cor_marca)
      ? broker.cor_marca
      : DEFAULT_BRAND_COLOR;
  const onBrand = contrastWithWhite(brand) >= 4.5 ? "#ffffff" : "#17202b";
  const count = statusCounts(units);
  const fromPrice = lowestPublicPrice(units);
  const place = [project.cidade, project.uf].filter(Boolean).join(" / ");
  const checkedAt = checkedAtLabel(project.informacoes_conferidas_em);
  const isBuilding =
    project.tipo === "predio" &&
    project.numero_andares &&
    project.unidades_por_andar;

  return (
    <div
      className="min-h-dvh bg-background"
      style={{ "--brand": brand, "--on-brand": onBrand } as React.CSSProperties}
    >
      {/* Broker's brand on top: the tour is "theirs" */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- already compressed WebP
            <img
              src={logo}
              alt={broker?.nome ?? "Logo"}
              className="h-9 w-auto max-w-40 object-contain"
            />
          ) : (
            <span className="font-heading font-semibold">
              {broker?.nome ?? "Vitrine 3D"}
            </span>
          )}
          {broker?.creci && (
            <span className="text-sm text-muted-foreground">
              CRECI {broker.creci}
            </span>
          )}
        </div>
      </header>

      <section className="relative">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- already compressed WebP
          <img
            src={cover}
            alt=""
            className="aspect-[16/9] max-h-[60vh] w-full object-cover sm:aspect-[21/9]"
            fetchPriority="high"
          />
        ) : (
          <div className="aspect-[21/9] w-full bg-[var(--brand)]" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent">
          <div className="mx-auto max-w-5xl px-4 pt-16 pb-5 text-white">
            <h1 className="font-heading text-3xl font-bold tracking-tight font-stretch-semi-expanded sm:text-4xl">
              {project.nome}
            </h1>
            {place && <p className="mt-1 text-white/85">{place}</p>}
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-8">
        <section
          aria-labelledby="units-title"
          className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]"
        >
          <div
            className="relative rounded-lg border bg-card p-4"
            data-testid="tour-building"
          >
            {isBuilding ? (
              <BuildingIllustration
                className="mx-auto max-h-[28rem] w-full"
                floors={project.numero_andares!}
                unitsPerFloor={project.unidades_por_andar!}
                units={units}
              />
            ) : (
              <p className="p-8 text-center text-muted-foreground">
                Casa: uma unidade só.
              </p>
            )}
            <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2 py-0.5 text-xs text-muted-foreground">
              Imagem ilustrativa
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <h2 id="units-title" className="font-heading text-xl font-semibold">
              Unidades
            </h2>
            <ul
              className="flex flex-col gap-2 text-sm tabular-nums"
              data-testid="tour-status"
            >
              {UNIT_STATUSES.map((status) => (
                <li key={status} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 rounded-sm"
                    style={{ background: `var(--status-${status})` }}
                  />
                  {count[status]} {STATUS_LABEL[status].toLowerCase()}
                  {count[status] === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
            {fromPrice !== null && (
              <p className="text-sm">
                A partir de{" "}
                <strong className="text-lg" data-testid="tour-from-price">
                  {formatMoney(fromPrice)}
                </strong>
              </p>
            )}
            {typologies.length > 0 && (
              <ul className="flex flex-col gap-2">
                {typologies.map((t) => (
                  <li key={t.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-muted-foreground">
                      {[
                        plural(t.quartos, "quarto", "quartos"),
                        t.suites ? plural(t.suites, "suíte", "suítes") : null,
                        plural(t.vagas, "vaga", "vagas"),
                        t.area_privativa_m2
                          ? `${formatDecimal(t.area_privativa_m2)} m²`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {(project.descricao || project.endereco) && (
          <section
            aria-labelledby="about-title"
            className="flex max-w-2xl flex-col gap-3"
          >
            <h2 id="about-title" className="font-heading text-xl font-semibold">
              Sobre o empreendimento
            </h2>
            {project.descricao && (
              <p className="whitespace-pre-line text-muted-foreground">
                {project.descricao}
              </p>
            )}
            {project.endereco && (
              <p className="text-sm">
                <span className="font-medium">Endereço:</span>{" "}
                {project.endereco}
                {place ? `, ${place}` : ""}
              </p>
            )}
          </section>
        )}

        <section
          aria-labelledby="safety-title"
          className="flex max-w-2xl flex-col gap-3 rounded-lg border p-5"
          data-testid="tour-safety"
        >
          <h2 id="safety-title" className="font-heading text-xl font-semibold">
            Segurança da compra
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Construtora</dt>
              <dd className="font-medium">
                {project.construtora ?? "Não informada"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                Registro de incorporação
              </dt>
              <dd className="font-medium">
                {project.registro_incorporacao ?? "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entrega</dt>
              <dd className="font-medium">
                {deliveryLabel(project.previsao_entrega)}
              </dd>
            </div>
          </dl>
          {checkedAt && (
            <p className="text-xs text-muted-foreground">{checkedAt}</p>
          )}
        </section>

        {broker && (
          <section
            aria-labelledby="broker-title"
            className="flex max-w-2xl items-center gap-4 rounded-lg p-5"
            style={{ background: "var(--brand)", color: "var(--on-brand)" }}
          >
            {avatar && (
              // eslint-disable-next-line @next/next/no-img-element -- already compressed WebP
              <img
                src={avatar}
                alt=""
                className="size-16 shrink-0 rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-sm opacity-85">Seu corretor</p>
              <h2
                id="broker-title"
                className="font-heading text-lg font-semibold"
              >
                {broker.nome}
              </h2>
              {broker.creci && (
                <p className="text-sm opacity-85">CRECI {broker.creci}</p>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Imagens ilustrativas. Valores e disponibilidade sujeitos a confirmação
        com o corretor.
      </footer>
    </div>
  );
}
