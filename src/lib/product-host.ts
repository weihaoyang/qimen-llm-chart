/**
 * Product routing is deliberately host-based instead of CSS or client state.
 * The 知几 workbench is served from its own hosts while sharing one deployment
 * and the SingSeq Platform account/usage boundary.
 */
export const PAIPAN_HOSTS = new Set([
  "qmdj.singseq.com",
  "www.qmdj.singseq.com",
  "paipan.singseq.com",
  "www.paipan.singseq.com",
]);

export const isPaipanHost = (host: string | null | undefined) => {
  if (!host) return false;
  return PAIPAN_HOSTS.has(host.trim().toLowerCase().split(":", 1)[0] ?? "");
};
