"""Conditional comparison of two historical Zi Qi entries; not a production ephemeris."""


def midnight_jd(year: int, month: int, day: int, *, gregorian: bool) -> float:
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    jdn = day + (153 * m + 2) // 5 + 365 * y + y // 4
    jdn += -(y // 100) + y // 400 - 32045 if gregorian else -32083
    return jdn - 0.5


def compare(period: int) -> tuple[float, float]:
    # Hypothesis only: take both mansion starts from the 1684 ecliptic table,
    # convert 365.25 Chinese degrees to 360 modern degrees, and ignore epoch drift.
    anchor = 275 + 50 / 60 + 11 * 360 / 365.25
    target = 220 + 41 / 60 + 14 * 360 / 365.25
    days = midnight_jd(1667, 2, 1, gregorian=True) - midnight_jd(1531, 2, 4, gregorian=False)
    projected = (anchor + (days % period) * 360 / period) % 360
    residual = (projected - target + 180) % 360 - 180
    return residual, residual * period / 360


if __name__ == "__main__":
    assert midnight_jd(1531, 2, 4, gregorian=False) == 2280289.5
    assert midnight_jd(1667, 2, 1, gregorian=True) == 2329950.5
    for cycle in (10228, 10227):
        degrees, days = compare(cycle)
        print(f"cycle={cycle} residual={degrees:.6f} degrees ({days:.2f} days)")
