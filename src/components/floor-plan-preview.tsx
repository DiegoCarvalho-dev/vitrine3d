import { cn } from "cn";

import { bounds } from "@/lib/planta/geometry";
import { formatDecimal } from "@/lib/validacoes/numero";
import type { Point } from "@/lib/validacoes/planta";

export type PreviewRoom = {
  id: string;
  name: string;
  points: Point[];
  area: number;
};

const PAD = 0.6; // meters of margin around the plan

/**
 * 2D floor plan in SVG, to scale (1 SVG unit = 1 m). Origin (0,0) at the
 * bottom-left, like the data: the Y axis is flipped for the screen.
 * `draft` = the room being typed (red when it overlaps another room).
 */
export function FloorPlanPreview({
  rooms,
  highlightId,
  draft,
  className,
}: {
  rooms: PreviewRoom[];
  highlightId?: string | null;
  draft?: { points: Point[]; invalid: boolean } | null;
  className?: string;
}) {
  const box = bounds([
    [[0, 0]],
    ...rooms.map((r) => r.points),
    ...(draft ? [draft.points] : []),
  ]);
  const x1 = Math.max(box.x1, 4); // never smaller than 4 × 4 m
  const y1 = Math.max(box.y1, 4);
  const x0 = Math.min(box.x0, 0);
  const y0 = Math.min(box.y0, 0);
  const width = x1 - x0 + PAD * 2;
  const height = y1 - y0 + PAD * 2;
  // Screen coordinates (Y grows downwards on screen).
  const sx = (x: number) => x - x0 + PAD;
  const sy = (y: number) => y1 - y + PAD;
  const path = (points: Point[]) =>
    points.map(([x, y], i) => `${i ? "L" : "M"}${sx(x)},${sy(y)}`).join(" ") +
    " Z";
  const label = Math.max(0.28, Math.min(width, height) / 28);

  const gridLines = [];
  for (let x = Math.ceil(x0); x <= x1; x++)
    gridLines.push(
      <line key={`x${x}`} x1={sx(x)} x2={sx(x)} y1={sy(y0)} y2={sy(y1)} />,
    );
  for (let y = Math.ceil(y0); y <= y1; y++)
    gridLines.push(
      <line key={`y${y}`} x1={sx(x0)} x2={sx(x1)} y1={sy(y)} y2={sy(y)} />,
    );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Prévia da planta com ${rooms.length} cômodos`}
      className={cn("w-full rounded-lg border bg-card", className)}
      data-testid="floor-plan-preview"
    >
      <g className="stroke-border" strokeWidth={0.02}>
        {gridLines}
      </g>
      {rooms.map((room) => {
        const b = bounds([room.points]);
        const cx = sx((b.x0 + b.x1) / 2);
        const cy = sy((b.y0 + b.y1) / 2);
        const selected = room.id === highlightId;
        return (
          <g key={room.id} data-testid="floor-plan-room">
            <path
              d={path(room.points)}
              className={cn(
                selected
                  ? "fill-primary/20 stroke-primary"
                  : "fill-muted stroke-foreground/60",
              )}
              strokeWidth={selected ? 0.08 : 0.05}
              strokeLinejoin="round"
            />
            <text
              x={cx}
              y={cy - label * 0.15}
              textAnchor="middle"
              fontSize={label}
              className="fill-foreground font-medium"
            >
              {room.name}
            </text>
            <text
              x={cx}
              y={cy + label * 1.05}
              textAnchor="middle"
              fontSize={label * 0.85}
              className="fill-muted-foreground"
            >
              {formatDecimal(Math.round(room.area * 10) / 10)} m²
            </text>
          </g>
        );
      })}
      {draft && (
        <path
          d={path(draft.points)}
          className={cn(
            draft.invalid
              ? "fill-destructive/20 stroke-destructive"
              : "fill-primary/10 stroke-primary",
          )}
          strokeWidth={0.06}
          strokeDasharray="0.15 0.1"
          data-testid="floor-plan-draft"
        />
      )}
      {/* 1 m scale bar */}
      <g className="fill-muted-foreground stroke-muted-foreground">
        <line
          x1={sx(x0)}
          x2={sx(x0) + 1}
          y1={height - PAD / 3}
          y2={height - PAD / 3}
          strokeWidth={0.04}
        />
        <text
          x={sx(x0) + 1.15}
          y={height - PAD / 3 + label * 0.3}
          fontSize={label * 0.8}
          stroke="none"
        >
          1 m
        </text>
      </g>
    </svg>
  );
}
