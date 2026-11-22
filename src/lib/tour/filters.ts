import { z } from "zod";

import type { UnitStatus } from "@/lib/building";

// Filters of the public tour (issue #45). Pure functions: the rule, the URL
// format (`?quartos=3&ate=500000`) and the counter live here, unit tested.

export type TourFilters = {
  bedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minFloor?: number;
  maxFloor?: number;
  onlyAvailable: boolean;
};

export const NO_FILTERS: TourFilters = { onlyAvailable: false };

/** What the filter needs to know about a unit (all public data). */
export type FilterUnit = {
  andar: number;
  status: UnitStatus;
  /** Bedrooms of the unit's typology; null = no typology yet. */
  quartos: number | null;
  /** Public price; null = "sob consulta". */
  preco: number | null;
};

const count = z.coerce.number().int().min(0).max(200);
const money = z.coerce.number().min(0).max(999_999_999_999);

type Params = Record<string, string | string[] | undefined>;

/** Reads filters from the URL. Anything invalid is simply ignored. */
export function parseFilters(params: Params): TourFilters {
  const raw = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  const read = <T>(schema: z.ZodType<T>, key: string): T | undefined => {
    const value = raw(key);
    if (value === undefined) return undefined;
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  };
  const filters: TourFilters = { onlyAvailable: raw("disponiveis") === "1" };
  const bedrooms = read(count, "quartos");
  const minPrice = read(money, "de");
  const maxPrice = read(money, "ate");
  const minFloor = read(count, "andar_de");
  const maxFloor = read(count, "andar_ate");
  if (bedrooms !== undefined) filters.bedrooms = bedrooms;
  if (minPrice !== undefined) filters.minPrice = minPrice;
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;
  if (minFloor !== undefined) filters.minFloor = minFloor;
  if (maxFloor !== undefined) filters.maxFloor = maxFloor;
  return filters;
}

/** The query string for the filters ("" when there are none). */
/** ?utm_source=instagram → "instagram" (validated again on the server). */
export function utmSource(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value.slice(0, 100) : null;
}

export function filtersToSearch(filters: TourFilters): string {
  const search = new URLSearchParams();
  if (filters.bedrooms !== undefined)
    search.set("quartos", String(filters.bedrooms));
  if (filters.minPrice !== undefined)
    search.set("de", String(filters.minPrice));
  if (filters.maxPrice !== undefined)
    search.set("ate", String(filters.maxPrice));
  if (filters.minFloor !== undefined)
    search.set("andar_de", String(filters.minFloor));
  if (filters.maxFloor !== undefined)
    search.set("andar_ate", String(filters.maxFloor));
  if (filters.onlyAvailable) search.set("disponiveis", "1");
  return search.toString();
}

export function hasPriceFilter(filters: TourFilters): boolean {
  return filters.minPrice !== undefined || filters.maxPrice !== undefined;
}

export function hasActiveFilters(filters: TourFilters): boolean {
  return filtersToSearch(filters) !== "";
}

/**
 * Does the unit pass the filters? A unit "sob consulta" (no public price)
 * passes ANY price range: hiding it would hide units the buyer could ask
 * about, and the price filter never reveals the hidden price.
 */
export function matchesFilters(
  unit: FilterUnit,
  filters: TourFilters,
): boolean {
  if (filters.onlyAvailable && unit.status !== "disponivel") return false;
  if (filters.bedrooms !== undefined && unit.quartos !== filters.bedrooms)
    return false;
  if (filters.minFloor !== undefined && unit.andar < filters.minFloor)
    return false;
  if (filters.maxFloor !== undefined && unit.andar > filters.maxFloor)
    return false;
  if (unit.preco !== null) {
    if (filters.minPrice !== undefined && unit.preco < filters.minPrice)
      return false;
    if (filters.maxPrice !== undefined && unit.preco > filters.maxPrice)
      return false;
  }
  return true;
}

export function countMatches(
  units: readonly FilterUnit[],
  filters: TourFilters,
): number {
  return units.filter((unit) => matchesFilters(unit, filters)).length;
}

export function foundLabel(n: number): string {
  if (n === 0) return "Nenhuma unidade encontrada";
  return n === 1 ? "1 unidade encontrada" : `${n} unidades encontradas`;
}

/**
 * Cleans filters that came from a (possibly hand-edited) link: values with no
 * matching option are dropped, and an inverted range is swapped.
 */
export function normalizeFilters(
  filters: TourFilters,
  limits: { bedroomOptions: readonly number[]; maxFloor: number },
): TourFilters {
  const next = { ...filters };
  if (
    next.bedrooms !== undefined &&
    !limits.bedroomOptions.includes(next.bedrooms)
  ) {
    delete next.bedrooms;
  }
  for (const key of ["minFloor", "maxFloor"] as const) {
    const value = next[key];
    if (value !== undefined && (value < 1 || value > limits.maxFloor))
      delete next[key];
  }
  if (
    next.minPrice !== undefined &&
    next.maxPrice !== undefined &&
    next.minPrice > next.maxPrice
  ) {
    [next.minPrice, next.maxPrice] = [next.maxPrice, next.minPrice];
  }
  if (
    next.minFloor !== undefined &&
    next.maxFloor !== undefined &&
    next.minFloor > next.maxFloor
  ) {
    [next.minFloor, next.maxFloor] = [next.maxFloor, next.minFloor];
  }
  return next;
}

/** A range typed with the start after the end (nothing can match). */
export function hasInvertedRange(filters: TourFilters): boolean {
  return (
    (filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice) ||
    (filters.minFloor !== undefined &&
      filters.maxFloor !== undefined &&
      filters.minFloor > filters.maxFloor)
  );
}
