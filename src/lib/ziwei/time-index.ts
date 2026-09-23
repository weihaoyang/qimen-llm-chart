/**
 * Maps a civil clock hour to iztro's 时辰 index.
 *
 * iztro uses indices `0..12`, where `0` is 早子时 (00:00–01:00) and `12` is
 * 晚子时 (23:00–23:59) — the two halves of 子时 are distinct indices. Which day a
 * 晚子时 birth belongs to is *not* decided here: iztro resolves that from its
 * day-division convention, which this product drives from the user's
 * `baziSettings.dayBoundary` (see `buildZiweiChartFromProfile`).
 *
 * This lives in one place because the natal chart is built twice — by the
 * server-side builder for the AI payload and by the vendor component for display
 * — and a drift between the two copies is exactly how the two panels ended up
 * disagreeing about 23:00 births.
 */
export const toTimeIndex = (hour: number) => {
  if (hour === 0) {
    return 0;
  }

  if (hour === 23) {
    return 12;
  }

  return Math.floor((hour + 1) / 2);
};
