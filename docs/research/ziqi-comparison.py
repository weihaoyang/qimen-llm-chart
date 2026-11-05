"""Conditional comparison of two historical Zi Qi entries; not a production ephemeris."""

from decimal import Decimal


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


def ming_history_residual() -> Decimal:
    # 明史卷三十六：从箕初起算，箕全日268.52为斗初；
    # 亢行末累计8936.3792为氐初，入宿各整度按28日计。
    cycle = Decimal("10227.1792")
    dou_start = Decimal("268.52")
    di_start = Decimal("8936.3792")
    predicted_interval = (di_start + 14 * 28) - (dou_start + 11 * 28)
    elapsed = Decimal("49661")
    return (elapsed % cycle) - predicted_interval


if __name__ == "__main__":
    assert midnight_jd(1531, 2, 4, gregorian=False) == 2280289.5
    assert midnight_jd(1667, 2, 1, gregorian=True) == 2329950.5
    assert ming_history_residual() == Decimal("0.4240")
    print(f"Ming table residual={ming_history_residual()} days")
    for cycle in (10228, 10227):
        degrees, days = compare(cycle)
        print(f"cycle={cycle} residual={degrees:.6f} degrees ({days:.2f} days)")
