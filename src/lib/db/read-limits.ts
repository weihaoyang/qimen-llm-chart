/**
 * Upper bound on rows returned by a list read that has no natural bound.
 *
 * These are guard rails, not pagination. Every query using this limit is already
 * scoped to a single owner, battle or case, so real usage stays far below the
 * cap — the point is that a pathological row count cannot turn a list request
 * into an unbounded scan that holds a pool connection and materialises the whole
 * result in memory.
 *
 * A query that genuinely needs to return more than this needs pagination, not a
 * bigger number.
 */
export const LIST_READ_LIMIT = 200;
