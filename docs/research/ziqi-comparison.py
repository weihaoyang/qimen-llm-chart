"""Conditional comparison of two historical Zi Qi entries; not a production ephemeris."""

from decimal import Decimal
from datetime import date


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


def ming_930_comparison() -> tuple[Decimal, Decimal]:
    # 按《明史》宿表从1531斗十一回推；古度是距柳初的值，不是现代黄经。
    cycle = Decimal("10227.1792")
    anchor = Decimal("268.52") + 11 * 28
    elapsed = Decimal("219274")
    phase = (anchor - elapsed) % cycle
    if phase < 0:
        phase += cycle
    liu_start = Decimal("6182.0192")
    xing_start = Decimal("6546.0192")
    assert liu_start <= phase < xing_start
    return (phase - liu_start) / 28, xing_start + 28 - phase


def ming_1911_comparison() -> tuple[Decimal, Decimal]:
    """Compare a 1911 facsimile date with the Ming table, without mixing their mansion boundaries."""
    cycle = Decimal("10227.1792")
    anchor = Decimal("268.52") + 11 * 28
    elapsed = Decimal(str(
        midnight_jd(1911, 4, 19, gregorian=True)
        - midnight_jd(1531, 2, 4, gregorian=False)
    ))
    phase = (anchor + elapsed) % cycle
    liu_start, xing_start = Decimal("6182.0192"), Decimal("6546.0192")
    assert liu_start <= phase < xing_start
    return elapsed, (phase - liu_start) / 28


def qing_rate_comparison() -> tuple[Decimal, Decimal, Decimal]:
    """Qing decimal arcseconds/day; longitude is conditional on the epoch and palace convention."""
    rate = Decimal("126.720777")
    period = Decimal(360 * 3600) / rate
    days = Decimal((date(1911, 4, 19) - date(1743, 12, 23)).days)
    # Conditional only: seven completed 30-degree palaces, Gregorian epoch.
    anchor = Decimal(7 * 30 + 17) + Decimal(50) / 60 + Decimal(14) / 3600 + Decimal(53) / 216000
    longitude = (anchor + days * rate / 3600) % 360
    return days, period, longitude


def qing_1911_mansion_comparison() -> list[tuple[date, Decimal, Decimal]]:
    """Conditional Qing 1911 comparison: winter-solstice origin and 1684 mansion table."""
    epoch = date(1743, 12, 23)  # Modern date inferred for the day after winter solstice.
    mansion_epoch = date(1684, 1, 1)  # Explicit approximation used by the product table.
    year_days = Decimal("365.24233442")
    rate = Decimal("126.720777") / 3600
    anchor = Decimal(7 * 30 + 17) + Decimal(50) / 60 + Decimal(14) / 3600 + Decimal(53) / 216000
    ghost_start = Decimal(121) + Decimal(20) / 60  # 270° + 七宫一度二十分
    rows = []
    for day, observed_minutes in [(date(1911, 3, 30), 225), (date(1911, 4, 9), 246), (date(1911, 4, 19), 267)]:
        longitude = (Decimal(270) + anchor + Decimal((day - epoch).days) * rate) % 360
        ghost = ghost_start + Decimal((day - mansion_epoch).days) / year_days * Decimal(51) / 3600
        predicted_minutes = (longitude - ghost) * 60
        rows.append((day, predicted_minutes, predicted_minutes - observed_minutes))
    return rows


def qing_1911_liu_comparison() -> list[tuple[date, Decimal, Decimal]]:
    """April and September lunar dates independently transcribed from the facsimile."""
    epoch = date(1743, 12, 23)
    mansion_epoch = date(1684, 1, 1)
    anchor = Decimal(7 * 30 + 17) + Decimal(50) / 60 + Decimal(14) / 3600 + Decimal(53) / 216000
    liu_start = Decimal(125) + Decimal(52) / 60
    rows = []
    for day, observed in [(date(1911, 4, 29), 14), (date(1911, 5, 9), 35), (date(1911, 5, 19), 56),
                          (date(1911, 10, 22), 385), (date(1911, 11, 1), 406), (date(1911, 11, 11), 428)]:
        longitude = (Decimal(270) + anchor + Decimal((day - epoch).days) * Decimal("126.720777") / 3600) % 360
        mansion = liu_start + Decimal((day - mansion_epoch).days) / Decimal("365.24233442") * Decimal(51) / 3600
        predicted = (longitude - mansion) * 60
        rows.append((day, predicted, predicted - observed))
    return rows


def jiajing_1531_intervals() -> tuple[list[int], int]:
    # Each month: (month length, day entering a new whole degree).
    # Leap sixth month is kept as a separate month; the eleventh has two entries.
    months = [(30, [18]), (30, [16]), (29, [14]), (29, [13]),
              (30, [12]), (29, [10]), (29, [9]), (30, [8]),
              (29, [6]), (30, [5]), (30, [3]), (29, [1, 29]), (30, [13])]
    events: list[int] = []
    elapsed = 0
    for length, days in months:
        events.extend(elapsed + day - 1 for day in days)
        elapsed += length
    return [b - a for a, b in zip(events[:-2], events[1:-1])], events[-1] - events[-2]


if __name__ == "__main__":
    qing_days, qing_period, qing_longitude = qing_rate_comparison()
    assert qing_days == 61112
    assert abs(qing_period - Decimal("10227.21001781736")) < Decimal("0.000001")
    print(f"Qing daily rate implies {qing_period:.5f} days/revolution; conditional longitude {qing_longitude:.5f} degrees")
    for day, predicted, residual in qing_1911_mansion_comparison():
        assert abs(residual) < 1
        print(f"{day}: conditional Ghost {predicted:.3f} arcminutes; residual {residual:+.3f} arcminutes")
    for day, predicted, residual in qing_1911_liu_comparison():
        assert abs(residual) < 2
        print(f"{day}: conditional Willow {predicted:.3f} arcminutes; residual {residual:+.3f} arcminutes")
    assert midnight_jd(1531, 2, 4, gregorian=False) == 2280289.5
    assert midnight_jd(1667, 2, 1, gregorian=True) == 2329950.5
    assert midnight_jd(930, 10, 3, gregorian=False) == 2061015.5
    liu_degree, delay_to_xing_one = ming_930_comparison()
    assert abs(liu_degree - Decimal("4.230114285714285714285714286")) < Decimal("0.00000001")
    assert delay_to_xing_one == Decimal("273.5568")
    print(f"930 Ming-table reconstruction: Liu {liu_degree:.3f} ancient degrees; {delay_to_xing_one} days before Xing 1")
    elapsed_1911, degree_1911 = ming_1911_comparison()
    assert elapsed_1911 == Decimal("138856")
    assert abs(degree_1911 - Decimal("10.61325714285714285714285714")) < Decimal("0.00000001")
    print(f"1911 facsimile date: {elapsed_1911} days from anchor; Ming-table Liu {degree_1911:.3f} ancient degrees")
    # 三月初一、十一、二十一：鬼3°45′、4°06′、4°27′；角分按60进位。
    observed_arcminutes = [3 * 60 + 45, 4 * 60 + 6, 4 * 60 + 27]
    assert [b - a for a, b in zip(observed_arcminutes, observed_arcminutes[1:])] == [21, 21]
    assert abs(Decimal(observed_arcminutes[-1] - observed_arcminutes[0]) - Decimal(20 * 60) / 28) < 1
    print("1911 facsimile: 21 + 21 arcminutes over 20 days; 28-day-per-degree model differs by < 1 arcminute")
    intervals, boundary = jiajing_1531_intervals()
    assert intervals == [28] * 12
    assert boundary == 13
    assert Decimal("23.47") * 28 - 23 * 28 == Decimal("13.16")
    print(f"Jiajing 1531: {len(intervals)} intervals of 28 days; Dou-to-Niu: {boundary} days (table 13.16)")
    assert ming_history_residual() == Decimal("0.4240")
    print(f"Ming table residual={ming_history_residual()} days")
    for cycle in (10228, 10227):
        degrees, days = compare(cycle)
        print(f"cycle={cycle} residual={degrees:.6f} degrees ({days:.2f} days)")
