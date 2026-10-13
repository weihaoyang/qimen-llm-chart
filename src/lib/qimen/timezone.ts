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
    hour12: false,
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
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
};

export const formatDateTimeInZone = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
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
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
};

export const toZonedDate = (datetime: string, timeZone: string) => {
  const target = parseLocalDateTime(datetime);
  const utcGuess = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second,
  );

  const guessDate = new Date(utcGuess);
  const zoned = getTimeZoneParts(guessDate, timeZone);
  const zonedUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  const correctedDate = new Date(
    utcGuess - (zonedUtc - utcGuess),
  );
  const correctedParts = getTimeZoneParts(correctedDate, timeZone);

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

  return correctedDate;
};
