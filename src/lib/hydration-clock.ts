import { useEffect, useState } from "react";

/**
 * The instant the workbench pretends it is during the server render.
 *
 * `new Date()` is not the same value on the server and in the browser, so a
 * component that derives "now" during render emits different HTML on the two
 * sides and React reports a hydration mismatch. Everything clock-dependent is
 * therefore resolved against this fixed instant first and replaced with the real
 * clock in a mount effect.
 *
 * Midday UTC is deliberate. It is far from midnight in every populated time
 * zone, so the fallback cannot land on a different calendar day, month or year
 * than a naive local read would — which is exactly the drift this constant
 * exists to avoid.
 */
export const HYDRATION_SAFE_DATE = new Date("2000-01-01T12:00:00.000Z");

/** Paired with `HYDRATION_SAFE_DATE` so the fallback is fully deterministic. */
export const HYDRATION_SAFE_TIME_ZONE = "Asia/Shanghai";

export type ResolvedClock = {
  /** Hydration-safe until `resolved` flips, then the visitor's real wall clock. */
  now: Date;
  timeZone: string;
  /** False during SSR and during the first client render. */
  resolved: boolean;
};

const readTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || HYDRATION_SAFE_TIME_ZONE;
  } catch {
    // Older or locked-down runtimes can throw here. The fallback is still a
    // valid IANA zone, so downstream formatting keeps working.
    return HYDRATION_SAFE_TIME_ZONE;
  }
};

/**
 * Resolve the wall clock and the visitor's time zone once, after mount.
 *
 * This is the page's single clock swap. Callers must treat `resolved === false`
 * as "render the hydration-safe placeholder" and do their real work when it
 * flips, rather than reading `new Date()` themselves — otherwise the page grows
 * a second, unsynchronized swap and the panels disagree about which day it is.
 */
export const useResolvedClock = (): ResolvedClock => {
  const [clock, setClock] = useState<ResolvedClock>({
    now: HYDRATION_SAFE_DATE,
    timeZone: HYDRATION_SAFE_TIME_ZONE,
    resolved: false,
  });

  useEffect(() => {
    // One-shot mount read of a client-only value: the server cannot know the
    // visitor's clock or time zone, so this is the only place they can come from.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount read of a client-only value
    setClock({ now: new Date(), timeZone: readTimeZone(), resolved: true });
  }, []);

  return clock;
};
