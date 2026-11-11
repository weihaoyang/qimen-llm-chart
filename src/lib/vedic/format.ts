/** Format a degree within one sign to the nearest minute without crossing its boundary. */
export const formatRashiDegree = (degree: number) => {
  const total = Math.min(29 * 60 + 59, Math.max(0, Math.round(degree * 60)));
  return `${Math.floor(total / 60)}°${String(total % 60).padStart(2, "0")}′`;
};
