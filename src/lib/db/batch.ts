/**
 * Helpers for turning a per-row write loop into a single statement.
 *
 * The repositories used to insert one row per round trip inside a transaction
 * that already held a `FOR UPDATE` lock on the battle row. With the route-level
 * bounds (timeline: 200 nodes / 500 edges, opportunities: 100) that meant up to
 * 500 sequential statements per request, all while the lock was held.
 *
 * The multi-row `VALUES` form is used instead of `unnest(...)` on purpose: it
 * passes only scalar parameters, so there is no array-literal serialization to
 * get wrong for `jsonb` / `timestamptz` columns, and each column keeps its
 * explicit cast.
 */

export type MultiRowStatement = { text: string; values: unknown[] };

/**
 * Build `INSERT INTO <table>(<columns>) VALUES (...),(...)`.
 *
 * `casts[i]` is the Postgres cast for column `i` (`"jsonb"`, `"timestamptz"`,
 * `null` for none). Casts matter here: without them an untyped parameter in a
 * `VALUES` list is inferred from the target column, which is fine for `text` but
 * not for `jsonb`/timestamptz where the driver sends a plain string.
 */
export const buildMultiRowInsert = (
  table: string,
  columns: readonly string[],
  casts: readonly (string | null)[],
  rows: readonly (readonly unknown[])[],
): MultiRowStatement => {
  if (columns.length !== casts.length) {
    throw new Error(`buildMultiRowInsert: ${columns.length} columns but ${casts.length} casts`);
  }
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    if (row.length !== columns.length) {
      throw new Error(`buildMultiRowInsert: expected ${columns.length} values per row, got ${row.length}`);
    }
    return `(${row.map((value, index) => {
      values.push(value);
      const cast = casts[index];
      return `$${values.length}${cast ? `::${cast}` : ""}`;
    }).join(",")})`;
  });
  return {
    text: `INSERT INTO ${table}(${columns.join(",")}) VALUES ${tuples.join(",")}`,
    values,
  };
};

/**
 * Re-order rows returned by a multi-row statement back into the caller's order.
 *
 * `INSERT ... VALUES` returns rows in insertion order in practice, but that is
 * not a documented guarantee, and the API responses are ordered arrays. Sorting
 * by the client-generated keys makes the order a property of the request rather
 * than of the storage engine.
 *
 * A missing key is not tolerated: it means the statement did not return a row
 * that it was asked to write, which is a bug rather than a degraded result.
 */
export const orderRowsByKey = <T>(
  rows: readonly T[],
  keys: readonly string[],
  keyOf: (row: T) => string,
  label: string,
): T[] => {
  const byKey = new Map(rows.map((row) => [keyOf(row), row]));
  return keys.map((key) => {
    const row = byKey.get(key);
    if (!row) throw new Error(`${label}: 写入后未返回 id=${key} 的行`);
    return row;
  });
};
