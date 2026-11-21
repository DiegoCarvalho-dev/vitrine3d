"use client";

import { useState } from "react";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  countMatches,
  type FilterUnit,
  foundLabel,
  hasActiveFilters,
  hasInvertedRange,
  hasPriceFilter,
  NO_FILTERS,
  type TourFilters as Filters,
} from "@/lib/tour/filters";
import { formatMoney, parseMoney } from "@/lib/validacoes/unidade";

/**
 * Filters of the tour (issue #45): bedrooms, price range, floor range and
 * "só disponíveis". Desktop: always open. Phone: a button opens the panel as
 * a drawer from the bottom (one single form, so no duplicated fields).
 */
export function TourFilters({
  filters,
  onChange,
  units,
  bedroomOptions,
  maxFloor,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  units: readonly FilterUnit[];
  bedroomOptions: number[];
  maxFloor: number;
}) {
  const [open, setOpen] = useState(false);
  const found = countMatches(units, filters);
  const active = hasActiveFilters(filters);
  const someOnRequest = units.some((u) => u.preco === null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-medium tabular-nums"
          data-testid="tour-found"
        >
          {foundLabel(found)}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="md:hidden"
          aria-expanded={open}
          aria-controls="tour-filters-panel"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Fechar filtros" : `Filtros${active ? " (ativos)" : ""}`}
        </Button>
      </div>

      <div
        id="tour-filters-panel"
        role="group"
        aria-label="Filtros"
        className={
          (open
            ? "fixed inset-x-0 bottom-0 z-40 max-h-[80svh] overflow-y-auto rounded-t-2xl border-t bg-background p-4 shadow-2xl"
            : "hidden") +
          " md:static md:block md:rounded-lg md:border md:p-4 md:shadow-none"
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm">
            Quartos
            <NativeSelect
              className="h-10 md:h-8"
              value={filters.bedrooms ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  bedrooms:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            >
              <option value="">Qualquer</option>
              {bedroomOptions.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1 quarto" : `${n} quartos`}
                </option>
              ))}
            </NativeSelect>
          </label>

          <PriceField
            label="Preço de"
            value={filters.minPrice}
            onChange={(minPrice) => onChange({ ...filters, minPrice })}
          />
          <PriceField
            label="Preço até"
            value={filters.maxPrice}
            onChange={(maxPrice) => onChange({ ...filters, maxPrice })}
          />

          <div className="grid grid-cols-2 gap-2">
            <FloorField
              label="Andar de"
              value={filters.minFloor}
              max={maxFloor}
              onChange={(minFloor) => onChange({ ...filters, minFloor })}
            />
            <FloorField
              label="Andar até"
              value={filters.maxFloor}
              max={maxFloor}
              onChange={(maxFloor) => onChange({ ...filters, maxFloor })}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={filters.onlyAvailable}
              onChange={(e) =>
                onChange({ ...filters, onlyAvailable: e.target.checked })
              }
            />
            Só disponíveis
          </label>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!active}
              onClick={() => onChange(NO_FILTERS)}
            >
              Limpar filtros
            </Button>
            <Button
              size="sm"
              className="md:hidden"
              onClick={() => setOpen(false)}
            >
              Ver {found} {found === 1 ? "unidade" : "unidades"}
            </Button>
          </div>
        </div>

        {hasInvertedRange(filters) && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            O valor inicial é maior que o final: nenhuma unidade vai aparecer.
          </p>
        )}
        {hasPriceFilter(filters) && someOnRequest && (
          <p
            className="mt-3 text-xs text-muted-foreground"
            data-testid="tour-price-note"
          >
            Unidades com preço “sob consulta” aparecem em qualquer faixa de
            preço.
          </p>
        )}
      </div>
    </div>
  );
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  // Text while typing ("450.000"); the number goes up only when it is valid.
  const [text, setText] = useState(
    value === undefined ? "" : formatMoney(value),
  );
  const parsed = parseMoney(text);
  // "Limpar filtros" empties the value from outside: empty the field too.
  if (value === undefined && typeof parsed === "number") setText("");
  const invalid = parsed === "invalid";

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      <Input
        inputMode="decimal"
        placeholder="R$"
        value={text}
        aria-invalid={invalid}
        onChange={(e) => {
          setText(e.target.value);
          const next = parseMoney(e.target.value);
          if (next !== "invalid") onChange(next ?? undefined);
        }}
        onBlur={() => {
          if (parsed !== "invalid" && parsed !== null)
            setText(formatMoney(parsed));
        }}
      />
      {invalid && (
        <span className="text-xs text-destructive">
          Use só números (ex.: 500.000).
        </span>
      )}
    </label>
  );
}

function FloorField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number | undefined;
  max: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      <NativeSelect
        className="h-10 md:h-8"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
      >
        <option value="">—</option>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}º
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
