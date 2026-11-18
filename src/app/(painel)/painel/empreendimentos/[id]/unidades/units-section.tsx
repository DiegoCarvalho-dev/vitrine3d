"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { cn } from "cn";

import { BuildingIllustration } from "@/components/building-illustration";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatMoney,
  parseMoney,
  UNIT_STATUS,
  type UnitStatus,
} from "@/lib/validacoes/unidade";

import { generateUnits, removeUnitsOutsideGrid, updateUnits } from "./actions";

export type UnitRow = {
  id: string;
  andar: number;
  numero: string;
  posicao_no_andar: number;
  tipologia_id: string | null;
  preco: number | null;
  exibir_preco: boolean;
  status: UnitStatus;
};

type Changes = {
  typologyId?: string | null;
  price?: string;
  showPrice?: boolean;
  status?: UnitStatus;
};

const KEEP = "__keep__";
const NONE = "__none__";

export function UnitsSection({
  projectId,
  floors,
  unitsPerFloor,
  units,
  typologies,
  gridComplete,
}: {
  projectId: string;
  floors: number;
  unitsPerFloor: number;
  units: UnitRow[];
  typologies: { id: string; nome: string }[];
  gridComplete: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [bulkTypology, setBulkTypology] = useState(KEEP);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStatus, setBulkStatus] = useState<UnitStatus | "">("");

  const typologyName = useMemo(
    () => new Map(typologies.map((t) => [t.id, t.nome])),
    [typologies],
  );
  const byFloor = useMemo(() => {
    const map = new Map<number, UnitRow[]>();
    for (const unit of units)
      map.set(unit.andar, [...(map.get(unit.andar) ?? []), unit]);
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [units]);
  const outsideCount = units.filter(
    (u) =>
      u.andar < 1 || u.andar > floors || u.posicao_no_andar > unitsPerFloor,
  ).length;
  const count = { disponivel: 0, reservado: 0, vendido: 0 };
  for (const unit of units) count[unit.status]++;

  function call(
    action: () => Promise<{ ok?: boolean; error?: string; message?: string }>,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (result.message) toast.success(result.message);
        onSuccess?.();
      } catch {
        toast.error(
          "Não foi possível conectar. Verifique a internet e tente de novo.",
        );
      }
    });
  }

  const save = (unitIds: string[], changes: Changes, onSuccess?: () => void) =>
    call(() => updateUnits(projectId, { unitIds, changes }), onSuccess);

  function toggle(ids: string[], on?: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      const turnOn = on ?? ids.some((id) => !next.has(id));
      for (const id of ids) {
        if (turnOn) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const column = (position: number) =>
    units.filter((u) => u.posicao_no_andar === position).map((u) => u.id);
  const selectedIds = [...selected];

  function applyBulk(changes: Changes) {
    if (!selectedIds.length) return;
    save(selectedIds, changes, () => {
      setBulkPrice("");
      setBulkTypology(KEEP);
      setBulkStatus("");
    });
  }

  return (
    <section aria-labelledby="units-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="units-title" className="font-heading text-xl font-semibold">
          Unidades
        </h2>
        <Button
          variant={units.length ? "outline" : "default"}
          disabled={pending}
          onClick={() => call(() => generateUnits(projectId))}
        >
          {units.length
            ? "Gerar unidades que faltam"
            : `Gerar ${floors * unitsPerFloor} unidades`}
        </Button>
      </div>

      {units.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          O prédio tem {floors} andares × {unitsPerFloor} unidades por andar.
          Gere a grade inteira de uma vez (101, 102…) e depois ajuste só o que
          muda.
        </p>
      ) : (
        <>
          {!gridComplete && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <span>
                {outsideCount
                  ? `${outsideCount} unidade(s) estão fora do tamanho atual do prédio.`
                  : "Faltam unidades para completar a grade do prédio."}{" "}
                A grade precisa bater com o tamanho para publicar.
              </span>
              {outsideCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => call(() => removeUnitsOutsideGrid(projectId))}
                >
                  Remover as que estão fora
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-6">
            <BuildingIllustration
              className="w-40 shrink-0"
              floors={Math.max(floors, ...units.map((u) => u.andar))}
              unitsPerFloor={Math.max(
                unitsPerFloor,
                ...units.map((u) => u.posicao_no_andar),
              )}
              units={units}
            />
            <ul
              className="flex flex-col gap-1.5 text-sm tabular-nums"
              data-testid="status-summary"
            >
              {UNIT_STATUS.map(([status, label]) => (
                <li key={status} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 rounded-sm"
                    style={{ background: `var(--status-${status})` }}
                  />
                  {count[status]} {label.toLowerCase()}
                  {count[status] === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
          </div>

          {/* Bulk edit */}
          <div
            className="flex flex-col gap-3 rounded-lg border bg-card p-3"
            data-testid="bulk-bar"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium tabular-nums" aria-live="polite">
                {selected.size} selecionada{selected.size === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">
                · Selecionar finais:
              </span>
              {Array.from({ length: unitsPerFloor }, (_, i) => i + 1).map(
                (position) => {
                  const ids = column(position);
                  const on =
                    ids.length > 0 && ids.every((id) => selected.has(id));
                  return (
                    <Button
                      key={position}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      aria-pressed={on}
                      onClick={() => toggle(ids)}
                    >
                      {String(position).padStart(2, "0")}
                    </Button>
                  );
                },
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  toggle(
                    units.map((u) => u.id),
                    true,
                  )
                }
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                Limpar
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-sm">
                Tipologia
                <NativeSelect
                  className="w-40"
                  value={bulkTypology}
                  onChange={(e) => setBulkTypology(e.target.value)}
                  aria-label="Tipologia para as selecionadas"
                >
                  <option value={KEEP}>Escolha…</option>
                  <option value={NONE}>Sem tipologia</option>
                  {typologies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <Button
                size="sm"
                disabled={pending || !selected.size || bulkTypology === KEEP}
                onClick={() =>
                  applyBulk({
                    typologyId: bulkTypology === NONE ? null : bulkTypology,
                  })
                }
              >
                Aplicar tipologia
              </Button>
              <label className="ml-2 flex flex-col gap-1 text-sm">
                Preço
                <Input
                  className="w-36"
                  inputMode="decimal"
                  placeholder="R$ 450.000,00"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  aria-label="Preço para as selecionadas"
                />
              </label>
              <Button
                size="sm"
                disabled={pending || !selected.size || !bulkPrice.trim()}
                onClick={() => applyBulk({ price: bulkPrice })}
              >
                Aplicar preço
              </Button>
              <label className="ml-2 flex flex-col gap-1 text-sm">
                Status
                <NativeSelect
                  className="w-36"
                  value={bulkStatus}
                  onChange={(e) =>
                    setBulkStatus(e.target.value as UnitStatus | "")
                  }
                  aria-label="Status para as selecionadas"
                >
                  <option value="">Escolha…</option>
                  {UNIT_STATUS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <Button
                size="sm"
                disabled={pending || !selected.size || !bulkStatus}
                onClick={() => bulkStatus && applyBulk({ status: bulkStatus })}
              >
                Aplicar status
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !selected.size}
                onClick={() => applyBulk({ showPrice: true })}
              >
                Mostrar preço
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !selected.size}
                onClick={() => applyBulk({ showPrice: false })}
              >
                Sob consulta
              </Button>
              <p className="self-center text-sm text-muted-foreground">
                “Sob consulta”: o cliente não vê o preço no tour e fala com
                você.
              </p>
            </div>
          </div>

          {/* One row per unit, top floor first (like the building). */}
          <div className="overflow-x-auto rounded-lg border">
            <table
              className="w-full min-w-[42rem] text-sm"
              data-testid="units-table"
            >
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="w-10 p-2">
                    <span className="sr-only">Selecionar</span>
                  </th>
                  <th className="p-2">Unidade</th>
                  <th className="p-2">Tipologia</th>
                  <th className="p-2">Preço</th>
                  <th className="p-2">Preço no tour</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              {byFloor.map(([floor, rows]) => (
                <tbody key={floor} className="border-t">
                  <tr className="bg-muted/40">
                    <th
                      colSpan={6}
                      scope="rowgroup"
                      className="p-2 text-left font-medium"
                    >
                      {floor === 0 ? "Térreo" : `${floor}º andar`}
                    </th>
                  </tr>
                  {rows.map((unit) => (
                    <UnitRowView
                      key={`${unit.id}-${unit.preco}-${unit.exibir_preco}-${unit.status}-${unit.tipologia_id}`}
                      unit={unit}
                      checked={selected.has(unit.id)}
                      onCheck={(on) => toggle([unit.id], on)}
                      typologies={typologies}
                      typologyName={typologyName}
                      disabled={pending}
                      save={(changes) => save([unit.id], changes)}
                    />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function UnitRowView({
  unit,
  checked,
  onCheck,
  typologies,
  typologyName,
  disabled,
  save,
}: {
  unit: UnitRow;
  checked: boolean;
  onCheck: (on: boolean) => void;
  typologies: { id: string; nome: string }[];
  typologyName: Map<string, string>;
  disabled: boolean;
  save: (changes: Changes) => void;
}) {
  const [price, setPrice] = useState(formatMoney(unit.preco));
  const label = `Unidade ${unit.numero}`;

  return (
    <tr
      className={cn("border-t", checked && "bg-primary/5")}
      data-testid={`unit-${unit.numero}`}
    >
      <td className="p-2">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          aria-label={`Selecionar ${label}`}
        />
      </td>
      <td className="p-2 font-medium tabular-nums">{unit.numero}</td>
      <td className="p-2">
        <NativeSelect
          className="w-36"
          value={unit.tipologia_id ?? NONE}
          disabled={disabled}
          aria-label={`Tipologia da ${label}`}
          onChange={(e) =>
            save({
              typologyId: e.target.value === NONE ? null : e.target.value,
            })
          }
        >
          <option value={NONE}>—</option>
          {typologies.map((t) => (
            <option key={t.id} value={t.id}>
              {typologyName.get(t.id)}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="p-2">
        <Input
          className="w-36 tabular-nums"
          inputMode="decimal"
          placeholder="R$"
          value={price}
          aria-label={`Preço da ${label}`}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            const parsed = parseMoney(price);
            if (parsed === "invalid") {
              toast.error(`Preço inválido na ${label} (ex.: 450.000,00).`);
              return;
            }
            if (parsed === unit.preco) return;
            setPrice(formatMoney(parsed));
            save({ price });
          }}
        />
      </td>
      <td className="p-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={unit.exibir_preco}
            disabled={disabled}
            onChange={(e) => save({ showPrice: e.target.checked })}
            aria-label={`Mostrar o preço da ${label}`}
          />
          <span className={unit.exibir_preco ? "" : "text-muted-foreground"}>
            {unit.exibir_preco ? "Mostrar" : "Sob consulta"}
          </span>
        </label>
      </td>
      <td className="p-2">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-sm"
            style={{ background: `var(--status-${unit.status})` }}
          />
          <NativeSelect
            className="w-32"
            value={unit.status}
            disabled={disabled}
            aria-label={`Status da ${label}`}
            onChange={(e) => save({ status: e.target.value as UnitStatus })}
          >
            {UNIT_STATUS.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </NativeSelect>
        </span>
      </td>
    </tr>
  );
}
