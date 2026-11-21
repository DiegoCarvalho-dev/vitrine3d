// Tipos e dados de exemplo do prédio, compartilhados pelo desenho em SVG
// (página inicial) e pela cena 3D (/lab/3d). Na Sprint 4 os status passam a
// vir do banco (tabela unidades); por enquanto são fixos e determinísticos.

export type UnitStatus = "disponivel" | "reservado" | "vendido";

export const UNIT_STATUSES: UnitStatus[] = [
  "disponivel",
  "reservado",
  "vendido",
];

export const STATUS_LABEL: Record<UnitStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
};

// Box sizes in the 3D scene (scene units ≈ meters / 3), shared with the layout.
export const UNIT_W = 2;
export const UNIT_H = 1;
export const UNIT_D = 3;
export const UNIT_GAP = 0.12;

export type PlacedUnit = {
  floor: number;
  position: number;
  number: string;
  status: UnitStatus;
  /** Center of the box in the scene (building centered on x = 0). */
  x: number;
  y: number;
};

/**
 * Where each unit goes in the 3D building. `statusAt` returns null for a
 * position without a unit (it stays as bare structure). `numberAt` lets the
 * real number from the database win over the computed one.
 */
export function layoutUnits(
  floors: number,
  unitsPerFloor: number,
  statusAt: (floor: number, position: number) => UnitStatus | null,
  numberAt: (floor: number, position: number) => string = unitNumber,
): PlacedUnit[] {
  const list: PlacedUnit[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let position = 1; position <= unitsPerFloor; position++) {
      const status = statusAt(floor, position);
      if (!status) continue;
      list.push({
        floor,
        position,
        number: numberAt(floor, position),
        status,
        x: (position - 1 - (unitsPerFloor - 1) / 2) * (UNIT_W + UNIT_GAP),
        y: (floor - 1) * (UNIT_H + UNIT_GAP) + UNIT_H / 2,
      });
    }
  }
  return list;
}

/** "1 disponível", "2 disponíveis", "3 reservadas" (counting "unidades"). */
const STATUS_COUNT: Record<UnitStatus, [string, string]> = {
  disponivel: ["disponível", "disponíveis"],
  reservado: ["reservada", "reservadas"],
  vendido: ["vendida", "vendidas"],
};
export function statusCountLabel(status: UnitStatus, count: number): string {
  return `${count} ${STATUS_COUNT[status][count === 1 ? 0 : 1]}`;
}

// Cores em hex para o WebGL, que não lê variáveis CSS.
// Mantenha iguais aos tokens --status-* em src/app/globals.css.
export const STATUS_HEX: Record<UnitStatus, string> = {
  disponivel: "#2e9d6b",
  reservado: "#e5a823",
  vendido: "#a3a9b1",
};

export const DEMO_FLOORS = 10;
export const DEMO_UNITS_PER_FLOOR = 4;
export const DEMO_HIGHLIGHTED_UNIT = { floor: 9, position: 3 };

/** Número da unidade como o corretor fala: andar 9, posição 2 → "902". */
export function unitNumber(floor: number, position: number): string {
  return `${floor}${String(position).padStart(2, "0")}`;
}

/** Status de exemplo, fixo (não aleatório) para a página renderizar sempre igual. */
export function demoStatus(floor: number, position: number): UnitStatus {
  if (
    floor === DEMO_HIGHLIGHTED_UNIT.floor &&
    position === DEMO_HIGHLIGHTED_UNIT.position
  ) {
    return "disponivel";
  }
  const n = (floor * 7 + position * 3) % 10;
  if (n < 4) return "disponivel";
  if (n < 7) return "reservado";
  return "vendido";
}

export function demoStatusCount(
  floors = DEMO_FLOORS,
  unitsPerFloor = DEMO_UNITS_PER_FLOOR,
): Record<UnitStatus, number> {
  const count: Record<UnitStatus, number> = {
    disponivel: 0,
    reservado: 0,
    vendido: 0,
  };
  for (let floor = 1; floor <= floors; floor++) {
    for (let position = 1; position <= unitsPerFloor; position++) {
      count[demoStatus(floor, position)]++;
    }
  }
  return count;
}
