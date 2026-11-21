import { ImageResponse } from "next/og";

import { lowestPublicPrice } from "@/lib/tour/format";
import { getPublishedProject } from "@/lib/tour/queries";
import {
  contrastWithWhite,
  DEFAULT_BRAND_COLOR,
  HEX_COLOR,
} from "@/lib/validacoes/perfil";
import { formatMoney } from "@/lib/validacoes/unidade";

// Preview image (1200 × 630) for projects WITHOUT a cover: broker's brand
// color, name, place and the "a partir de" price (public price only).
export async function GET(
  _request: Request,
  { params }: RouteContext<"/e/[slug]/og">,
) {
  const tour = await getPublishedProject((await params).slug);
  if (!tour) return new Response("Not found", { status: 404 });
  const { project, broker, units } = tour;

  const brand =
    broker?.cor_marca && HEX_COLOR.test(broker.cor_marca)
      ? broker.cor_marca
      : DEFAULT_BRAND_COLOR;
  const text = contrastWithWhite(brand) >= 4.5 ? "#ffffff" : "#17202b";
  const place = [project.cidade, project.uf].filter(Boolean).join(" / ");
  const fromPrice = lowestPublicPrice(units);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: brand,
          color: text,
        }}
      >
        <div style={{ fontSize: 34, opacity: 0.85 }}>
          {broker?.nome ?? "Vitrine 3D"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.05 }}>
            {project.nome.slice(0, 60)}
          </div>
          {place && <div style={{ fontSize: 38, opacity: 0.9 }}>{place}</div>}
        </div>
        <div style={{ fontSize: 40 }}>
          {fromPrice !== null
            ? `A partir de ${formatMoney(fromPrice)}`
            : "Conheça em 3D"}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Crawlers (WhatsApp) fetch it often: let the CDN keep it for an hour.
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
