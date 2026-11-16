import {
  BuildingIllustration,
  demoStatusCount,
  STATUS_LABEL,
  type UnitStatus,
} from "@/components/building-illustration";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ViewIn3DButton } from "@/components/view-in-3d-button";

const STATUS_ORDER: UnitStatus[] = ["disponivel", "reservado", "vendido"];

export default function Home() {
  const count = demoStatusCount();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-8 sm:py-10">
      <header>
        <span className="font-heading text-lg font-bold tracking-tight font-stretch-semi-expanded">
          Vitrine 3D
        </span>
      </header>

      <main className="grid flex-1 items-center gap-12 py-10 md:grid-cols-[1.1fr_1fr] lg:gap-20">
        <section className="max-w-xl">
          <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight text-balance font-stretch-semi-expanded sm:text-5xl lg:text-6xl">
            Mande um link, não 30 fotos.
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            Seu cliente percorre o imóvel em 3D pelo celular, sem baixar nada.
            Você vê quais unidades ele abriu e quanto tempo ficou em cada uma.
          </p>
          <p className="mt-10 border-l-2 border-primary pl-3 text-sm text-muted-foreground">
            Em construção. A primeira demonstração sai em breve.
          </p>
        </section>

        <figure className="flex flex-col items-center gap-5">
          <div className="relative w-full max-w-sm">
            <div className="mx-auto max-w-64 sm:max-w-none">
              <BuildingIllustration className="w-full" />
            </div>
            <Card
              size="sm"
              className="mt-4 w-full shadow-md lg:absolute lg:top-[13%] lg:-left-36 lg:mt-0 lg:w-60"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
                  Apartamento 903
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <span
                      aria-hidden
                      className="size-2 rounded-full bg-status-disponivel"
                    />
                    Disponível
                  </span>
                </CardTitle>
                <CardDescription className="tabular-nums">
                  9º andar, 2 quartos, 65 m²
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  Preço sob consulta
                </span>
                <ViewIn3DButton unit="903" />
              </CardFooter>
            </Card>
          </div>

          <figcaption>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground tabular-nums">
              {STATUS_ORDER.map((status) => (
                <li key={status} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 rounded-[2px]"
                    style={{ backgroundColor: `var(--status-${status})` }}
                  />
                  {STATUS_LABEL[status]} ({count[status]})
                </li>
              ))}
            </ul>
          </figcaption>
        </figure>
      </main>
    </div>
  );
}
