/**
 * Product routing is deliberately host-based instead of CSS or client state.
 * This keeps the two public products separate while they share one deployment
 * and the Consumer Platform account/payment boundary.
 */
export const PAIPAN_HOSTS = new Set([
  "paipan.singseq.com",
  "www.paipan.singseq.com",
]);

export const isPaipanHost = (host: string | null | undefined) => {
  if (!host) return false;
  return PAIPAN_HOSTS.has(host.trim().toLowerCase().split(":", 1)[0] ?? "");
};
