// Prédio ilustrativo em SVG, gerado a partir de dados (andares × unidades),
// com a mesma lógica de cores por status do prédio 3D (src/lib/building.ts).
// Sem `units`, desenha o prédio de exemplo da página inicial; com `units`,
// desenha o prédio real do painel (issue #33). Posição sem unidade = cinza
// claro com contorno tracejado.

import {
  DEMO_FLOORS,
  DEMO_HIGHLIGHTED_UNIT,
  DEMO_UNITS_PER_FLOOR,
  demoStatus,
  type UnitStatus,
} from "@/lib/building";

// Geometria (unidades do viewBox).
const UNIT_W = 30;
const UNIT_H = 19;
const GAP = 4;
const DEPTH_X = 18; // profundidade da lateral (perspectiva oblíqua)
const DEPTH_Y = -11;
const LEFT = 10;
const TOP = 24;
const LOBBY_H = 26; // térreo mais alto que um andar

const fill = (status: UnitStatus) => `var(--status-${status})`;
const shade = (status: UnitStatus) =>
  `color-mix(in oklch, var(--status-${status}), black 28%)`;

export type BuildingUnit = {
  andar: number;
  posicao_no_andar: number;
  status: UnitStatus;
};

export function BuildingIllustration({
  className,
  floors = DEMO_FLOORS,
  unitsPerFloor = DEMO_UNITS_PER_FLOOR,
  units,
}: {
  className?: string;
  floors?: number;
  unitsPerFloor?: number;
  /** Real units; omitted = the demo building (fixed statuses). */
  units?: readonly BuildingUnit[];
}) {
  const byPosition = units
    ? new Map(units.map((u) => [`${u.andar}-${u.posicao_no_andar}`, u.status]))
    : null;
  const statusAt = (floor: number, position: number): UnitStatus | null =>
    byPosition
      ? (byPosition.get(`${floor}-${position}`) ?? null)
      : demoStatus(floor, position);
  const highlighted = units ? null : DEMO_HIGHLIGHTED_UNIT;

  const facadeW = unitsPerFloor * UNIT_W + (unitsPerFloor + 1) * GAP;
  const facadeH = floors * UNIT_H + (floors + 1) * GAP;
  const right = LEFT + facadeW;
  const towerBottom = TOP + facadeH;
  const bottom = towerBottom + LOBBY_H; // térreo envidraçado embaixo

  const count = { disponivel: 0, reservado: 0, vendido: 0 };
  for (let floor = 1; floor <= floors; floor++)
    for (let position = 1; position <= unitsPerFloor; position++) {
      const status = statusAt(floor, position);
      if (status) count[status]++;
    }
  const rows = Array.from({ length: floors }, (_, i) => floors - i); // top → 1

  return (
    <svg
      viewBox={`0 0 ${right + DEPTH_X + 12} ${bottom + 10}`}
      className={className}
      role="img"
      aria-label={`Prédio de ${floors} andares com ${unitsPerFloor} unidades por andar: ${count.disponivel} disponíveis, ${count.reservado} reservadas e ${count.vendido} vendidas.`}
      data-testid="building-illustration"
    >
      {/* Lateral e topo (concreto) */}
      <polygon
        points={`${LEFT},${TOP} ${LEFT + DEPTH_X},${TOP + DEPTH_Y} ${right + DEPTH_X},${TOP + DEPTH_Y} ${right},${TOP}`}
        fill="#cfccc5"
      />
      <polygon
        points={`${right},${TOP} ${right + DEPTH_X},${TOP + DEPTH_Y} ${right + DEPTH_X},${bottom + DEPTH_Y} ${right},${bottom}`}
        fill="#b9b5ad"
      />
      {/* Fachada (concreto) */}
      <rect x={LEFT} y={TOP} width={facadeW} height={facadeH} fill="#d4d0c8" />
      {/* Platibanda (cobertura) */}
      <rect
        x={LEFT - 2}
        y={TOP - 5}
        width={facadeW + 4}
        height={6}
        fill="#c4c0b8"
      />
      {/* Térreo: vidro escuro, pilares e marquise na cor da marca */}
      <rect
        x={LEFT + 4}
        y={towerBottom}
        width={facadeW - 8}
        height={LOBBY_H}
        fill="#3b4652"
      />
      <rect
        x={LEFT}
        y={towerBottom}
        width={5}
        height={LOBBY_H}
        fill="#d4d0c8"
      />
      <rect
        x={right - 5}
        y={towerBottom}
        width={5}
        height={LOBBY_H}
        fill="#d4d0c8"
      />
      <rect
        x={LEFT + facadeW / 2 - 18}
        y={towerBottom + 6}
        width={36}
        height={3}
        style={{ fill: "var(--primary)" }}
      />

      {rows.map((floor, row) => {
        const y = TOP + GAP + row * (UNIT_H + GAP);
        const lastStatus = statusAt(floor, unitsPerFloor);
        return (
          <g key={floor}>
            {/* Laje aparente, um pouco para fora da fachada */}
            <rect
              x={LEFT - 2}
              y={y + UNIT_H + GAP / 2 - 1}
              width={facadeW + 4}
              height={2.2}
              fill="#eeebe5"
            />
            {Array.from({ length: unitsPerFloor }, (_, i) => {
              const position = i + 1;
              const status = statusAt(floor, position);
              const x = LEFT + GAP + i * (UNIT_W + GAP);
              const isHighlighted =
                highlighted?.floor === floor &&
                highlighted.position === position;
              return status ? (
                <g key={position}>
                  {/* Vidro do apartamento */}
                  <rect
                    x={x}
                    y={y}
                    width={UNIT_W}
                    height={UNIT_H}
                    rx={1}
                    fill="#9db3c4"
                    stroke={isHighlighted ? "var(--primary)" : "none"}
                    strokeWidth={isHighlighted ? 2.5 : 0}
                  />
                  {/* Faixa da varanda na cor do status */}
                  <rect
                    x={x + 1}
                    y={y + UNIT_H - 6}
                    width={UNIT_W - 2}
                    height={5}
                    rx={0.8}
                    style={{ fill: fill(status) }}
                  />
                </g>
              ) : (
                <rect
                  key={position}
                  x={x}
                  y={y}
                  width={UNIT_W}
                  height={UNIT_H}
                  rx={1.5}
                  fill="#f2f1ee"
                  stroke="#a3a9b1"
                  strokeWidth={0.8}
                  strokeDasharray="3 2"
                />
              );
            })}
            {/* Janela lateral da última unidade do andar */}
            <polygon
              points={`${right + 3},${y + DEPTH_Y * 0.15} ${right + DEPTH_X - 3},${y + DEPTH_Y * 0.85} ${right + DEPTH_X - 3},${y + UNIT_H + DEPTH_Y * 0.85} ${right + 3},${y + UNIT_H + DEPTH_Y * 0.15}`}
              style={{ fill: lastStatus ? shade(lastStatus) : "#d6d3cc" }}
            />
          </g>
        );
      })}

      {/* Chão */}
      <line
        x1={0}
        y1={bottom + 0.5}
        x2={right + DEPTH_X + 12}
        y2={bottom + 0.5}
        stroke="#17202b"
        strokeWidth={1}
      />
    </svg>
  );
}
