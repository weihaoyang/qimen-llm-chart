/**
 * An error whose message is written for the end user and is therefore safe to
 * return verbatim from an HTTP handler.
 *
 * Routes used to answer with `error instanceof Error ? error.message : fallback`,
 * which meant any internal throw — a raw Postgres error, an AI-provider failure,
 * a fetch error, a provider schema violation, a missing environment variable —
 * was echoed straight to the browser. Marking the intentional messages
 * explicitly lets everything else collapse to a fixed string.
 *
 * By default the error carries **no** HTTP status: the responding route owns the
 * status (the same provider failure is a 500 from one route and a 502 from
 * another), while the throwing layer only asserts "this text is safe to show".
 *
 * `status` is for the narrower case of an error that is a **failure of the
 * request itself** rather than of the environment — a payload that references
 * another battle's rows, a duplicate id inside one list. Those are always 400 or
 * 409 no matter which route surfaced them, and leaving them to the route's
 * fallback meant every route had to re-derive the same mapping by hand (three
 * routes did, in three different ways). Set `status` only when the status is a
 * property of the error; otherwise let the route decide.
 *
 * `reasonCode` is forwarded to the client alongside the message when present, so
 * a caller can branch on the failure without parsing Chinese prose.
 *
 * This lives in its own module (rather than in `@/lib/api-error`) so that
 * library code such as `@/lib/agent/chat` can mark its deliberate messages
 * without pulling `next/server` into its module graph — `chat.ts` is reachable
 * from client components, which must not bundle server-only modules.
 */
export class UserFacingError extends Error {
  /** HTTP status to answer with, overriding the route's fallback status. */
  readonly status?: number;
  /** Stable machine-readable discriminator, forwarded to the client. */
  readonly reasonCode?: string;

  constructor(message: string, options?: { status?: number; reasonCode?: string }) {
    super(message);
    this.name = "UserFacingError";
    this.status = options?.status;
    this.reasonCode = options?.reasonCode;
  }
}
