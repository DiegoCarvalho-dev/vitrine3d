// The Data API returns at most 1000 rows per request (supabase/config.toml,
// max_rows). A building can have up to 200 × 50 = 10,000 units, so lists that
// can grow past that are read page by page.

const PAGE_SIZE = 1000;

type Page<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

/**
 * Reads every row using `page(from, to)` (an inclusive range, like
 * supabase-js `.range()`). The query MUST have a stable `.order()`.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => Page<T>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

/** Splits a list in chunks (keeps each request's URL short). */
export function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}
