const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
};

export const getTimeZoneParts = (date: Date, timeZone: string) => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const valueByType = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    year: Number(valueByType.year),
    month: Number(valueByType.month),
    day: Number(valueByType.day),
    hour: Number(valueByType.hour),
    minute: Number(valueByType.minute),
    second: Number(valueByType.second),
  };
};

const parseLocalDateTime = (datetime: string) => {
  const match = datetime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    throw new Error(`无法解析日期时间: ${datetime}`);
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
};

const pad = (value: number) => value.toString().padStart(2, "0");

export const formatLocalDateTime = (datetime: string) => {
  const parts = parseLocalDateTime(datetime);
  return `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
};

export const formatDateTimeInZone = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
};

/**
 * The wall-clock reading of `date` inside `timeZone`, as `YYYY-MM-DDTHH:mm`.
 *
 * This shape is what `<input type="datetime-local">` and `ProfileInput.datetime`
 * use. It must go through `timeZone` rather than `Date#getHours()`: the process
 * time zone of a server (production runs UTC) is not the visitor's, so a
 * process-local read makes the server render different text than the browser and
 * React reports a hydration mismatch.
 */
export const formatDateTimeInputInZone = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  return `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

const utcMillis = (year: number, month: number, day: number, hour: number, minute: number, second: number) => {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
};

export const toZonedDate = (datetime: string, timeZone: string) => {
  const target = parseLocalDateTime(datetime);
  const utcGuess = utcMillis(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second,
  );

  const guessDate = new Date(utcGuess);
  const zoned = getTimeZoneParts(guessDate, timeZone);
  const zonedUtc = utcMillis(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  let correctedDate = new Date(
    utcGuess - (zonedUtc - utcGuess),
  );
  let correctedParts = getTimeZoneParts(correctedDate, timeZone);
  // The first correction can cross a DST transition and change the offset.
  const correctedWallTime = utcMillis(
    correctedParts.year,
    correctedParts.month - 1,
    correctedParts.day,
    correctedParts.hour,
    correctedParts.minute,
    correctedParts.second,
  );
  if (correctedWallTime !== utcGuess) {
    correctedDate = new Date(correctedDate.getTime() + utcGuess - correctedWallTime);
    correctedParts = getTimeZoneParts(correctedDate, timeZone);
  }

  const isExact =
    correctedParts.year === target.year &&
    correctedParts.month === target.month &&
    correctedParts.day === target.day &&
    correctedParts.hour === target.hour &&
    correctedParts.minute === target.minute &&
    correctedParts.second === target.second;

  if (!isExact) {
    throw new Error(`无法在时区 ${timeZone} 中解析时间 ${datetime}`);
  }

  // A repeated wall time resolves to the earlier occurrence. Compare the
  // previous day's offset so this does not depend on the initial UTC guess.
  const previous = correctedDate.getTime() - 86_400_000;
  const previousParts = getTimeZoneParts(new Date(previous), timeZone);
  const previousOffset = utcMillis(
    previousParts.year, previousParts.month - 1, previousParts.day,
    previousParts.hour, previousParts.minute, previousParts.second,
  ) - previous;
  const earlier = utcGuess - previousOffset;
  if (earlier < correctedDate.getTime()) {
    const parts = getTimeZoneParts(new Date(earlier), timeZone);
    if (utcMillis(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) === utcGuess) {
      return new Date(earlier);
    }
  }
  return correctedDate;
};

/** Chinese calendrical ephemerides use a fixed UTC+08:00 clock. */
export const getChinaEphemerisParts = (instant: Date) =>
  getTimeZoneParts(new Date(instant.getTime() + 8 * 3_600_000), "UTC");
