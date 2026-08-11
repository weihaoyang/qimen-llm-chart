const pad = (value: number) => String(value).padStart(2, "0");

/** Shift a datetime-local value while preserving the input's local format. */
export const shiftDateTimeInput = (value: string, hours: number) => {
  const source = new Date(value);
  if (Number.isNaN(source.getTime())) return value;

  source.setHours(source.getHours() + hours);
  return [
    source.getFullYear(),
    "-",
    pad(source.getMonth() + 1),
    "-",
    pad(source.getDate()),
    "T",
    pad(source.getHours()),
    ":",
    pad(source.getMinutes()),
  ].join("");
};
