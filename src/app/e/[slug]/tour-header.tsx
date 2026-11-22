import { getPublicEnv } from "@/lib/env";
import type { TourData } from "@/lib/tour/queries";
import { publicImageUrl } from "@/lib/validacoes/midia";
import { DEFAULT_BRAND_COLOR, HEX_COLOR } from "@/lib/validacoes/perfil";

/** The broker's brand color (validated), or the default. */
export function brandColor(broker: TourData["broker"]): string {
  return broker?.cor_marca && HEX_COLOR.test(broker.cor_marca)
    ? broker.cor_marca
    : DEFAULT_BRAND_COLOR;
}

/** Broker's logo (or name) and CRECI on top: the tour is the broker's. */
export function TourHeader({ broker }: { broker: TourData["broker"] }) {
  const logo = publicImageUrl(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    broker?.logo_url,
  );
  return (
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
  );
}
