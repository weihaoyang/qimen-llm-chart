/**
 * Narrowing helpers shared by request validation and database row mapping.
 *
 * They live here rather than in a domain module because both sides need them:
 * a route narrows untrusted input, and a repository narrows a column back into
 * a union. `as` casts on either side erase the guarantee that the value is one
 * of the allowed strings — the cast compiles whether or not the value holds.
 */

/**
 * Narrow an unknown value to a member of a closed string set.
 *
 * Returns a type predicate so callers get narrowing instead of a widened value:
 * `if (!isIn(x, KINDS)) return …` leaves `x` typed as `KINDS[number]` afterwards.
 */
export const isIn = <T extends readonly string[]>(value: unknown, values: T): value is T[number] =>
  typeof value === "string" && values.includes(value);

/**
 * Narrow a database column into a union, reporting a value the code does not
 * understand instead of casting it.
 *
 * Used for rows the product did not just write. A value outside `allowed` means
 * the column holds something this build cannot represent — a migration added a
 * member, or the row was written by hand. Casting would let it through as a
 * valid member and surface as an impossible UI state; `fallback` keeps the read
 * path total while `reportSwallowedError` makes the drift visible.
 */
export const narrowColumn = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  report: (value: unknown) => void,
): T => {
  if (isIn(value, allowed)) return value;
  report(value);
  return fallback;
};
