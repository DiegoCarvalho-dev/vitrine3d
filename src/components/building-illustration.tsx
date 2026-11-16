// Prédio ilustrativo em SVG, gerado a partir de dados (andares × unidades),
// com a mesma lógica de cores por status do prédio 3D (src/lib/building.ts).

import {
  DEMO_FLOORS as FLOORS,
  DEMO_HIGHLIGHTED_UNIT as HIGHLIGHTED_UNIT,
  DEMO_UNITS_PER_FLOOR as UNITS_PER_FLOOR,
  demoStatus,
  demoStatusCount,
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
const FACADE_W = UNITS_PER_FLOOR * UNIT_W + (UNITS_PER_FLOOR + 1) * GAP;
const FACADE_H = FLOORS * UNIT_H + (FLOORS + 1) * GAP;
const RIGHT = LEFT + FACADE_W;
const BOTTOM = TOP + FACADE_H;

const fill = (status: UnitStatus) => `var(--status-${status})`;
const shade = (status: UnitStatus) =>
  `color-mix(in oklch, var(--status-${status}), black 28%)`;

export function BuildingIllustration({ className }: { className?: string }) {
  const count = demoStatusCount();
  const rows = Array.from({ length: FLOORS }, (_, i) => FLOORS - i); // 10 → 1

  return (
    <svg
      viewBox={`0 0 ${RIGHT + DEPTH_X + 12} ${BOTTOM + 10}`}
      className={className}
      role="img"
      aria-label={`Prédio de ${FLOORS} andares com ${UNITS_PER_FLOOR} unidades por andar: ${count.disponivel} disponíveis, ${count.reservado} reservadas e ${count.vendido} vendidas.`}
    >
      {/* Lateral e topo (concreto) */}
      <polygon
        points={`${LEFT},${TOP} ${LEFT + DEPTH_X},${TOP + DEPTH_Y} ${RIGHT + DEPTH_X},${TOP + DEPTH_Y} ${RIGHT},${TOP}`}
        fill="#cfccc5"
      />
      <polygon
        points={`${RIGHT},${TOP} ${RIGHT + DEPTH_X},${TOP + DEPTH_Y} ${RIGHT + DEPTH_X},${BOTTOM + DEPTH_Y} ${RIGHT},${BOTTOM}`}
        fill="#b9b5ad"
      />
      {/* Fachada */}
      <rect
        x={LEFT}
        y={TOP}
        width={FACADE_W}
        height={FACADE_H}
        fill="#e2e0db"
      />

      {rows.map((floor, row) => {
        const y = TOP + GAP + row * (UNIT_H + GAP);
        const lastStatus = demoStatus(floor, UNITS_PER_FLOOR);
        return (
          <g key={floor}>
            {Array.from({ length: UNITS_PER_FLOOR }, (_, i) => {
              const position = i + 1;
              const status = demoStatus(floor, position);
              const x = LEFT + GAP + i * (UNIT_W + GAP);
              const highlighted =
                floor === HIGHLIGHTED_UNIT.floor &&
                position === HIGHLIGHTED_UNIT.position;
              return (
                <rect
                  key={position}
                  x={x}
                  y={y}
                  width={UNIT_W}
                  height={UNIT_H}
                  rx={1.5}
                  style={{ fill: fill(status) }}
                  stroke={highlighted ? "var(--primary)" : "none"}
                  strokeWidth={highlighted ? 2.5 : 0}
                />
              );
            })}
            {/* Janela lateral da última unidade do andar */}
            <polygon
              points={`${RIGHT + 3},${y + DEPTH_Y * 0.15} ${RIGHT + DEPTH_X - 3},${y + DEPTH_Y * 0.85} ${RIGHT + DEPTH_X - 3},${y + UNIT_H + DEPTH_Y * 0.85} ${RIGHT + 3},${y + UNIT_H + DEPTH_Y * 0.15}`}
              style={{ fill: shade(lastStatus) }}
            />
          </g>
        );
      })}

      {/* Chão */}
      <line
        x1={0}
        y1={BOTTOM + 0.5}
        x2={RIGHT + DEPTH_X + 12}
        y2={BOTTOM + 0.5}
        stroke="#17202b"
        strokeWidth={1}
      />
    </svg>
  );
}
